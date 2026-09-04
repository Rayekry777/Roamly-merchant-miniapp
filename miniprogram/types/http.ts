export interface Result<T> {
  code: string;
  message: string;
  data: T | null;
}

export interface ErrorResult {
  code: string;
  message: string;
  fieldErrors?: Array<{ field: string; message: string }>;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}
