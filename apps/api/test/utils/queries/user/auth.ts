export const getRequestEmailVerificationMutation = (email: string) => ({
  query: `mutation RequestEmailVerification($email: String!) {
    requestEmailVerification(email: $email)
  }`,
  variables: { email },
});

export const getVerifyEmailMutation = (token: string) => ({
  query: `mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      userId
      email
      emailVerified
    }
  }`,
  variables: { token },
});

export const getForgotPasswordMutation = (email: string) => ({
  query: `mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }`,
  variables: { email },
});

export const getResetPasswordMutation = (token: string, newPassword: string) => ({
  query: `mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }`,
  variables: { token, newPassword },
});
