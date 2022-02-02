import AWS from 'aws-sdk';
import bent from "bent";


const dynamo = new AWS.DynamoDB.DocumentClient();
export const main = async (event, context, callback) => {

    const clientId = event.queryStringParameters != null ? event.queryStringParameters["clientId"] : null;
    if (!clientId)
        return ({
            statusCode: 400,
            body: JSON.stringify({"msg": "Must provide a clientId parameter"})

        });
    console.log(JSON.stringify(event.headers["Authorization"]));
    const subject = event.requestContext.authorizer.claims["sub"];
    const isAdmin = event.requestContext.authorizer.claims["custom:isAdmin"];
    const notExists = event.requestContext.authorizer.claims["custom:kiquetal"];
    console.log("isAdmin: ["+isAdmin+"]");
    console.log("notExists: ["+notExists+"]");
    if (!notExists)console.log("attribute_not_exists");
    if (!isAdmin || isAdmin != "yes") {

        const params = {
            TableName: process.env.APPS_TABLE,
            ProjectionExpression: "clientId,clientSecret",
      //      KeyConditionExpression: "pk = :pk and begins_with(#sk, :app)",
            KeyConditionExpression: "pk = :pk and #sk = :app",

            ExpressionAttributeValues: {
                ":pk": subject,
                ":app": `cred#${clientId}`
            },
            ExpressionAttributeNames: {
                "#sk": "sk",
            }
        };
        const resp = await dynamo.query(params).promise();
        console.log(JSON.stringify(resp));
        if (resp.Items.length < 1) {
            return ({
                statusCode: 404,
                body: JSON.stringify({"msg": `${clientId} is not associated with subjectId`})
            });
        }

       const authApigee=  'Basic '+ Buffer.from(resp.Items[0]["clientId"]+":"+resp.Items[0]["clientSecret"]).toString('base64');

       const rsJson = await obtainTokenApigee(authApigee);
         return ({
            statusCode: 200,
            body: JSON.stringify({"access_token":rsJson.access_token,
                  "expiresIn":rsJson.expires_in
            })
        });

    }
    else
    {  //admin Can request any credential
        if (isAdmin && isAdmin=="yes") {
            console.log("hello admin");
            const paramCred = {
                TableName: process.env.APPS_TABLE,
                Key: {
                    pk: `cred#${clientId}`,
                    sk: "CRED#ID"
                },
                AttributesToGet: [
                    "pk",
                    "clientId",
                    "clientSecret",
                    "name"
                ]
            };

            const credential = await dynamo.get(paramCred).promise();
            if (Object.keys(credential).length < 1) {
                return ({
                    statusCode: 404,
                    body: JSON.stringify({"msg": `${clientId} is not found.`})
                });
            }

            const authForApigee = 'Basic ' + Buffer.from(credential.Item["clientId"] + ":" + credential.Item["clientSecret"]).toString('base64');
            const rsJson = await obtainTokenApigee(authForApigee);
            return ({
                statusCode: 200,
                body: JSON.stringify({
                    "access_token": rsJson["access_token"],
                    "expires_in": rsJson["expires_in"]
                })
            });

        }
        else
        {
            console.log("never should reach here");
        }
    }

};

const obtainTokenApigee = async (basiAuth) => {
    const apigee =  bent('POST',200);

    const rp =await apigee("https://qa.api.tigo.com/oauth/client_credential/accesstoken?grant_type=client_credentials",null,{
        'Authorization': basiAuth
    });

    const rsJson = await rp.json();
    return rsJson;
};
