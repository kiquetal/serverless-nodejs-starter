import AWS from "aws-sdk";
export const main = async (event,context,callback) => {
    const cognito = new AWS.CognitoIdentityServiceProvider();
    const params = {
        Username: process.env.USERNAME,
        UserPoolId: process.env.USERPOOL_ID,
        UserAttributes:[{
            "Name":"custom:isAdmin",
            "Value":"true"

        }]
    };
    try {
        await cognito.adminUpdateUserAttributes(params).promise();
    }
    catch (err)
    {
        console.log(JSON.stringify(err.toString()));
    }

};
