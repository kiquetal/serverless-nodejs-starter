import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient();
export const main = async (event,context,callback) => {


    const bodyJSON = JSON.parse(event.body);
    const clientId = bodyJSON["credentials"]["clientId"];
    const clientSecret = bodyJSON["credentials"]["clientSecret"];
    const name = bodyJSON["nameApp"];
    const developerName = bodyJSON["developerEmail"];
    const params = {
        TableName: process.env.APPS_TABLE,
        Item: {
            pk: `cred#${clientId}`,
            sk: "CRED#ID",
            developerApp:developerName,
            clientId: clientId,
            clientSecret: clientSecret,
            nameApp:name,
            type: "CREDENTIAL"
        },
        ReturnValues:"ALL_OLD"
    };


    try {
        await dynamo.put(params).promise();
    }
    catch (err)
    {
        return ({
           statusCode:500,
           body:JSON.stringify({"msg":err.toString()})
        });
    }
      return ({
        statusCode: 200,
        body: JSON.stringify(params["Item"])
    });
};

export const get = async (event,context,callback) => {
    console.log(JSON.stringify(event.requestContext.authorizer));

    const subject = event.requestContext.authorizer.claims["sub"];
    try
    {

        const query = {
            TableName:process.env.APPS_TABLE,
            ProjectionExpression:"sk",
            KeyConditionExpression:"pk = :pk and begins_with(#sk, :app)",
            ExpressionAttributeValues:{
                ":pk":subject,
                ":app":"#cred"
            },
            ExpressionAttributeNames:{
                "#sk":"sk",

            },
        };
        const resp = await dynamo.query(query).promise();

        const queryApps = {
            TableName: process.env.APPS_TABLE,
            IndexName:"index_by_sk",
            KeyConditionExpression: "sk = :sk",
            ExpressionAttributeValues: {
                ":sk":"CREDENTIALS"
            },
            ProjectionExpression: "pk"
        };
        const allApps = await dynamo.query(queryApps).promise();

        return({
           statusCode:200,
           body:JSON.stringify({"myApp":resp.Items,
            "allApps":allApps.Items})
        });

    }
    catch (err)
    {
        return ({
            statusCode:500,
            body:JSON.stringify({"msg":err.toString()})
        });
    }

};
export const creds = async (event,context,callback) => {


    const bodyJSON = JSON.parse(event.body);
    const user = bodyJSON["userId"];
    const credentialsId = bodyJSON["credentialId"];

    const params = {
        TableName: process.env.APPS_TABLE,
        Item: {
            pk: user,
            sk: credentialsId,
            type: "USER#CREDENTIALS"
        },
        ReturnValues:"ALL_OLD"
    };


    try {
        await dynamo.put(params).promise();
    }
    catch (err)
    {
        return ({
            statusCode:500,
            body:JSON.stringify({"msg":err.toString()})
        });
    }
    return ({
        statusCode: 200,
        body: JSON.stringify(params["Item"])
    });

};
