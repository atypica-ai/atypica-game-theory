"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export interface SearchParamConfig<T> {
  /** Default value for the parameter */
  defaultValue: T;
  /** Function to serialize the value to string for URL */
  serialize?: (value: T) => string;
  /** Function to deserialize the string from URL to value */
  deserialize?: (value: string | null) => T;
}

export interface UseSearchParamsOptions<T extends Record<string, unknown>> {
  /** Configuration for each parameter */
  params: {
    [K in keyof T]: SearchParamConfig<T[K]>;
  };
  /** Initial values parsed from server-side (overrides defaultValue for initialization) */
  initialValues?: Partial<T>;
  /** Whether to use replaceState instead of pushState (default: true) */
  replaceState?: boolean;
  /** Debounce delay for URL updates in milliseconds (default: 0) */
  debounceMs?: number;
}

export interface UseSearchParamsReturn<T extends Record<string, unknown>> {
  /** Current parameter values */
  values: T;
  /** Update a single parameter */
  setParam: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Update multiple parameters at once */
  setParams: (updates: Partial<T>) => void;
  /** Reset all parameters to their default values */
  reset: () => void;
}

// Built-in serializers/deserializers
const stringConfig = {
  serialize: (value: string) => value,
  deserialize: (value: string | null, defaultValue: string) => {
    return value !== null && value.trim() !== "" ? value : defaultValue;
  },
};

const numberConfig = {
  serialize: (value: number) => value.toString(),
  deserialize: (value: string | null, defaultValue: number) => {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  },
};

const booleanConfig = {
  serialize: (value: boolean) => value.toString(),
  deserialize: (value: string | null, defaultValue: boolean) => {
    return value === null ? defaultValue : value === "true";
  },
};

const arrayConfig = {
  serialize: (value: unknown[]) => value.join(","),
  deserialize: (value: string | null, defaultValue: unknown[]) => {
    if (!value || value.trim() === "") return defaultValue;
    return value.split(",").filter((v) => v.length > 0);
  },
};

// Helper to create common parameter configurations
export const createParamConfig = {
  string: (defaultValue: string = ""): SearchParamConfig<string> => ({
    defaultValue,
    serialize: stringConfig.serialize,
    deserialize: (value: string | null) => stringConfig.deserialize(value, defaultValue),
  }),

  number: (defaultValue: number = 1): SearchParamConfig<number> => ({
    defaultValue,
    serialize: numberConfig.serialize,
    deserialize: (value: string | null) => numberConfig.deserialize(value, defaultValue),
  }),

  boolean: (defaultValue: boolean = false): SearchParamConfig<boolean> => ({
    defaultValue,
    serialize: booleanConfig.serialize,
    deserialize: (value: string | null) => booleanConfig.deserialize(value, defaultValue),
  }),

  stringArray: (defaultValue: string[] = []): SearchParamConfig<string[]> => ({
    defaultValue,
    serialize: arrayConfig.serialize,
    deserialize: (value: string | null) => arrayConfig.deserialize(value, defaultValue) as string[],
  }),

  numberArray: (defaultValue: number[] = []): SearchParamConfig<number[]> => ({
    defaultValue,
    serialize: (value: number[]) => value.join(","),
    deserialize: (value: string | null) => {
      if (!value || value.trim() === "") return defaultValue;
      return value
        .split(",")
        .map((v) => parseInt(v, 10))
        .filter((v) => !isNaN(v));
    },
  }),
};

/**
 * Hook for managing URL query parameters.
 *
 * IMPORTANT: This hook does NOT parse URL parameters from the browser.
 * It only updates the URL when parameter values change.
 *
 * URL parsing should always be done on the server side and passed as
 * initial values to avoid hydration mismatches and race conditions.
 */
export function useListQueryParams<T extends Record<string, unknown>>(
  options: UseSearchParamsOptions<T>,
): UseSearchParamsReturn<T> {
  const { params, initialValues, replaceState = true, debounceMs = 0 } = options;
  const router = useRouter();

  /**
   * 使用 ref 存储 params 配置的原因：
   *
   * 调用方通常会这样写：
   * useListQueryParams({
   *   params: {
   *     page: createParamConfig.number(1),
   *     search: createParamConfig.string(""),
   *     // ...
   *   }
   * })
   *
   * 这种写法会导致每次组件重新渲染时，params 都是一个全新的对象引用，即使内容完全相同。这会触发 useEffect 的重新执行，造成不必要的 URL 更新。
   *
   * 具体问题场景：当用户点击按钮触发某个方法（如 handleStartChat）时，该方法通常会：
   * 1) 调用 setState 更新组件状态（如 loading 状态）
   * 2) 执行异步操作
   * 3) 最后通过 router.push() 跳转到新页面
   *
   * 但由于第1步的 setState 会触发重新渲染 → params 对象重新创建 → useEffect 执行 URL 更新 → router.replace() 覆盖了第3步的 router.push()，
   * 最终用户点击按钮后页面没有跳转到预期页面，而是停留在当前页面。
   *
   * 虽然组件可以用 useMemo 包装 params 来避免这个问题，但很容易被忘记，而且这会增加每个调用方的心智负担。
   *
   * 由于 params 对于一个组件来说本质上是静态配置，在组件的整个生命周期中都不应该发生变化，所以这里可以安全地使用 ref 来存储，避免不必要的重新计算。
   *
   * 注意：如果未来遇到 params 需要动态变化的场景，可以考虑其他方案，比如深度比较或者提供专门的 updateParams 方法。
   */
  const paramsRef = useRef(params);

  // Initialize with server-parsed values if provided, otherwise use defaults
  const [values, setValues] = useState<T>(() => {
    const result = Object.keys(paramsRef.current).reduce((acc, key) => {
      const config = paramsRef.current[key as keyof T];
      // Use initialValues if provided, otherwise use defaultValue
      acc[key as keyof T] = initialValues?.[key as keyof T] ?? config.defaultValue;
      return acc;
    }, {} as T);
    return result;
  });

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Update URL when values change
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const updateUrl = () => {
      const url = new URL(window.location.href);

      // Update search parameters
      Object.keys(paramsRef.current).forEach((key) => {
        const config = paramsRef.current[key as keyof T];
        const value = values[key as keyof T];
        const serialize = config.serialize || ((v: unknown) => String(v));

        // Helper function to check if value is empty
        const isEmpty = (val: unknown): boolean => {
          if (val === null || val === undefined) return true;
          if (typeof val === "string" && val.trim() === "") return true;
          if (Array.isArray(val) && val.length === 0) return true;
          return false;
        };

        // Only set parameter if it's different from default and not empty
        if (value !== config.defaultValue && !isEmpty(value)) {
          url.searchParams.set(key, serialize(value));
        } else {
          url.searchParams.delete(key);
        }
      });

      const newUrl = url.pathname + url.search;

      if (replaceState) {
        router.replace(newUrl, { scroll: false });
      } else {
        router.push(newUrl, { scroll: false });
      }
    };

    if (debounceMs > 0) {
      timeoutRef.current = setTimeout(updateUrl, debounceMs);
    } else {
      updateUrl();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [values, replaceState, debounceMs, router]);

  const setParam = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setParams = useCallback((updates: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    const defaults = Object.keys(paramsRef.current).reduce((acc, key) => {
      const config = paramsRef.current[key as keyof T];
      acc[key as keyof T] = config.defaultValue;
      return acc;
    }, {} as T);
    setValues(defaults);
  }, []);

  return {
    values,
    setParam,
    setParams,
    reset,
  };
}
