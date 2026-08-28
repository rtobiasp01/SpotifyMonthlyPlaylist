export class AppError extends Error {
  public constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
  ) {
    super(message);

    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  public constructor(message = "Bad request.") {
    super(message, 400, "BAD_REQUEST");
  }
}

export class UnauthorizedError extends AppError {
  public constructor(message = "Unauthorized.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  public constructor(message = "Forbidden.") {
    super(message, 403, "FORBIDDEN");
  }
}
