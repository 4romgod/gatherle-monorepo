export const sendPostSignUpEmail = () => {
    const html = `
        <html>
            <body style="padding: 5px; font-family: PT Sans,Trebuchet MS,sans-serif;">
                <h1>Welcome to Ntlango</h1>
                <p>Hey there,</p>
                <p>Your email address has been registered with Ntlango.</p>
                <p>To complete your Ntlango registration, and as an additional security measure, you are requested to verify your email by clicking the link below:</p>
                <a"
                    style="background-color:#1c87c9; border: none; color: white; padding: 20px 34px; text-align: center; text-decoration: none; display: inline-block; font-size: 20px; margin: 4px 2px; cursor: pointer;"
                >
                    {##Verify Email##}
                </a>
                <br/>
                <p>If you did not associate your address with a Ntlango account, please ignore this message and do not click on the link above.</p>
            </body>
        </html>
    `;

    return {
        htmlContent: html,
        subject: 'Ntlango Registration Verification',
    };
};
