import { NextResponse } from "next/server";

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    pagination?: {
      cursor: string | null;
      hasMore: boolean;
      total: number;
    };
  };
}

interface ErrorDetail {
  field: string;
  message: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
  meta: {
    timestamp: string;
  };
}

export function successResponse<T>(
  data: T,
  status = 200,
  pagination?: { cursor: string | null; hasMore: boolean; total: number },
) {
  const body: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(pagination && { pagination }),
    },
  };
  return NextResponse.json(body, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: ErrorDetail[],
) {
  const body: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  return NextResponse.json(body, { status });
}

export function unauthorizedResponse() {
  return errorResponse("UNAUTHORIZED", "Authentication required", 401);
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse("NOT_FOUND", `${resource} not found`, 404);
}

export function validationErrorResponse(details: ErrorDetail[]) {
  return errorResponse(
    "VALIDATION_ERROR",
    "Request validation failed",
    400,
    details,
  );
}
