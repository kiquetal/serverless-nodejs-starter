import AWS from 'aws-sdk';
import * as https from "https";


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

    if (isAdmin == "true") {

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
        console.log(JSON.stringify(params));
        console.log(clientId);
        const resp = await dynamo.query(params).promise();
        console.log(JSON.stringify(resp));
        if (resp.Items.length < 1) {
            return ({
                statusCode: 404,
                body: JSON.stringify({"msg": `${clientId} is not associated with subjectId`})
            });
        }

        const rp = await getRequest("Basic "+Buffer.from(resp.Items[0]["clientId"]+":"+resp.Items[0]["clientSecret"]).toString('base64'));
         return ({
            statusCode: 200,
            body: JSON.stringify({"access_token":rp.access_token,
                  "expiresIn":rp.expires_in
            })
        });

    }

};


function getRequest(basicAuth) {
    const options = {
        hostname: 'qa.api.tigo.com',
        path: '/oauth/client_credential/accesstoken?grant_type=client_credentials',
        method: 'POST',
        port: 443, // 👈️ replace with 80 for HTTP requests
        headers: {
            'Authorization': basicAuth
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let rawData = '';

            res.on('data', chunk => {
                rawData += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(rawData));
                } catch (err) {
                    reject(new Error(err));
                }
            });
        });

        req.on('error', err => {
            reject(new Error(err));
        });

        // 👇 write the body to the Request object
      //  req.write(JSON.stringify(body));
        req.end();
    });
}

