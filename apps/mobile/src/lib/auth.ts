export function getAuthHeader(token: string | null | undefined): { Authorization: string } | Record<string, never> {
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getApolloAuthContext(token: string | null | undefined) {
  return {
    context: {
      headers: getAuthHeader(token),
    },
  };
}
