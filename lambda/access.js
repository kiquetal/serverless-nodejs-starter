import AWS from 'aws-sdk';
const dynamo = new AWS.DynamoDB.DocumentClient();

export const main = async (event,context,callback) => {

    const bodyJSON = JSON.parse(event.body);
    const subject= event.requestContext.authorizer.claims["sub"];
    try
    {

        const params= {
            TableName: process.env.APPS_TABLE,
            Item:{
                pk: bodyJSON["userId"],
                sk: bodyJSON["appId"],
                type:"USER#CREDS",
                admin:subject
            },
            ReturnValues:"ALL_OLD"
        };

        await dynamo.put(params).promise();
        return ({
            statusCode:200,
            body:JSON.stringify(params.Item)
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
