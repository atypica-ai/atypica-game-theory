declare module "d3-hierarchy" {
  export type HierarchyValueAccessor<T> = (node: T) => number;

  export interface HierarchyRectangularNode<T> {
    data: T;
    depth: number;
    parent?: HierarchyRectangularNode<T>;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    children?: HierarchyRectangularNode<T>[];
    sum(value: HierarchyValueAccessor<T>): HierarchyRectangularNode<T>;
    descendants(): HierarchyRectangularNode<T>[];
  }

  export interface TreemapLayout<T> {
    (root: HierarchyRectangularNode<T>): HierarchyRectangularNode<T>;
    size(size: [number, number]): TreemapLayout<T>;
    round(round: boolean): TreemapLayout<T>;
    paddingOuter(padding: number): TreemapLayout<T>;
    paddingInner(padding: number | ((node: HierarchyRectangularNode<T>) => number)): TreemapLayout<T>;
    paddingTop(padding: number | ((node: HierarchyRectangularNode<T>) => number)): TreemapLayout<T>;
    tile(tile: TreemapTiling<T>): TreemapLayout<T>;
  }

  export type TreemapTiling<T> = (
    node: HierarchyRectangularNode<T>,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) => void;

  export interface TreemapSquarify {
    <T>(node: HierarchyRectangularNode<T>, x0: number, y0: number, x1: number, y1: number): void;
    ratio(ratio: number): TreemapTiling<unknown>;
  }

  export function hierarchy<T>(data: T): HierarchyRectangularNode<T>;
  export function treemap<T>(): TreemapLayout<T>;
  export const treemapSquarify: TreemapSquarify;
}

