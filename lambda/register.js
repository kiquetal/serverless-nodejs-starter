import AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

function createModelForServer(listAttributes, bodyJSON) {

 const sub = listAttributes.filter( d => d.Name=="sub");
  return {
        pk: sub[0]["Value"],
        sk: bodyJSON["username"],
        username: bodyJSON["username"],
        password:bodyJSON["password"],
        country: bodyJSON["country"]
  };
}

export const main = async (event, context) => {
  const cognito = new AWS.CognitoIdentityServiceProvider();
  const bodyJSON= JSON.parse(event.body);
  const username = bodyJSON["username"];
  const password = bodyJSON["password"];
  const country = bodyJSON["country"];
  const params = {
    UserPoolId: process.env.USERPOOL_ID,
    Username: username,
    UserAttributes: [{
      Name: 'email',
      Value: username
    },
      {
        Name: 'email_verified',
        Value: 'true'
      },
      {
        Name:'custom:country',
        Value:country
      }
    ],
    MessageAction: 'SUPPRESS'
  };

  try {


    const response = await cognito.adminCreateUser(params).promise();


    if (response.User) {
      const paramsForSetPass = {
        Password: password,
        UserPoolId: process.env.USERPOOL_ID,
        Username: username,
        Permanent: true
      };
      await cognito.adminSetUserPassword(paramsForSetPass).promise();

      const listAttributes = response.User.Attributes;

      const modelServer = createModelForServer(listAttributes, bodyJSON);

     const attributes= await dynamo.put({
        TableName: process.env.SERVERS_TABLE,
        Item: modelServer,
        ConditionExpression: "attribute_not_exists(pk)"
      }).promise();
     console.log(JSON.stringify(attributes));


      return ({
        statusCode: 200,
        body: JSON.stringify(modelServer)
      });

    }

    else
      throw new Error("User returned null");
  }

  catch (error)
  {
    return ({
      statusCode: 500,
      body: JSON.stringify({"msg":error.toString()})
    });

  }
};

