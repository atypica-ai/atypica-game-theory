"use client";

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

  // Initialize with server-parsed values if provided, otherwise use defaults
  const [values, setValues] = useState<T>(() => {
    const result = Object.keys(params).reduce((acc, key) => {
      const config = params[key as keyof T];
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
      Object.keys(params).forEach((key) => {
        const config = params[key as keyof T];
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

      const method = replaceState ? "replaceState" : "pushState";
      window.history[method]({}, "", url.toString());
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
  }, [values, params, replaceState, debounceMs]);

  const setParam = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setParams = useCallback((updates: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    const defaults = Object.keys(params).reduce((acc, key) => {
      const config = params[key as keyof T];
      acc[key as keyof T] = config.defaultValue;
      return acc;
    }, {} as T);
    setValues(defaults);
  }, [params]);

  return {
    values,
    setParam,
    setParams,
    reset,
  };
}
