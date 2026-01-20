declare module "express" {
  export interface Request {
    params: Record<string, string>;
    body: Record<string, unknown>;
  }

  export interface Response {
    status: (code: number) => Response;
    json: (body: unknown) => Response;
  }
}
