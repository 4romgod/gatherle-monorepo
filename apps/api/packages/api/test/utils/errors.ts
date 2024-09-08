export class MockMongoError {
  code: number;
  message: string;

  constructor(code: number, message = 'A mock Error') {
    this.code = code;
    this.message = message;
  }
}
