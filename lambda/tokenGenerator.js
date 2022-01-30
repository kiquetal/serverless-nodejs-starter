import AWS from 'aws-sdk';

export const main = async (event, context, callback) => {

    const dynamo = new AWS.DynamoDB.DocumentClient();
    const subject = event.request.userAttributes["sub"];
    console.log("Authentication successful");
    console.log("Trigger function =", event.triggerSource);
    console.log("User pool = ", event.userPoolId);
    console.log("App client ID = ", event.callerContext.clientId);
    console.log("User ID = ", event.userName);
    console.log("Sub", subject);
    let type="SERVERID";
    if (event.userName.startsWith("millicom-sso"))
        type="USERID";
    try
    {
             await dynamo.put({
            TableName: process.env.APPS_TABLE,
            Item: {
                pk: subject,
                sk:"USER#ID",
                email: event.request.userAttributes.email,
                type:type
            },
            ConditionExpression: "attribute_not_exists(pk)"
        }).promise();
    }
    catch (e)
    {
        console.log(e.message);
    }

return event;
};
