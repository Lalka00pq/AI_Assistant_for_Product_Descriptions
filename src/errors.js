export class ServiceError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
  }
}
