export class MalipoError extends Error {
  public readonly code: string | undefined;
  public readonly status: number;
  public readonly details: Record<string, any> | undefined;

  constructor(message: string, status: number, code?: string, details?: Record<string, any>) {
    super(message);
    this.name = "MalipoError";
    this.status = status;
    this.code = code;
    this.details = details;

    // Ensure the prototype is correctly set for instanceOf checks
    Object.setPrototypeOf(this, MalipoError.prototype);
  }
}
