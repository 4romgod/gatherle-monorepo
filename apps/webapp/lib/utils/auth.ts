import { decode, JwtPayload } from "jsonwebtoken";

export const isAuthenticated = (token: string | undefined) => {
  const decodedToken = token ? (decode(token) as JwtPayload | null) : null;
  const expiresAt = decodedToken?.exp ? decodedToken.exp * 1000 : null;
  const isTokenExpired = expiresAt ? Date.now() > expiresAt : false;
  return Boolean(token && !isTokenExpired);
};
