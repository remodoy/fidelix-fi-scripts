var http = require('http');
var url = require('url'); // access url variables
var axios = require('axios');

// kopiointi nodejs-projektikansioon:
// sudo cp /Users/jarkkomatilainen/Desktop/_fidelix_hae_yhteystiedot/NodeAxios.js NodeAxios.js


function endWithError(message, responseValue, res)
{
	//console.log(message);
	res.writeHead(responseValue, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
	res.end(message);
}

http.createServer(function (req, res)
{
	//console.log("____METHOD: "+req.method+"____");
	if (req.method == "OPTIONS")
	{
		var headers =
		{
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, DELETE',
			'Access-Control-Max-Age': '60',
			'Access-Control-Allow-Headers': 'Origin, X-Requested-With, token, Content-Type, Accept, Access-Control-Allow-Origin',
			'Content-Type': 'text/plain'
		};
		res.writeHead(204, headers);
		res.end();
	}
	else if (req.method == "GET")
	{
		var urlVariables = url.parse(req.url, true).query;
		var address = urlVariables.address;
		var crawl = urlVariables.crawl;
		//console.log("address="+address);
		if (address == null)
		{
			endWithError("error! no url variable named 'address'!",400,res);
		}
		else
		{
			if (crawl == "true")
			{
				startCrawling(res, address);
			}
			else
			{
				whois.lookup(address, function(err, data)
				{
					if(err)
					{
						endWithError("whois: error! "+err,400,res);
					}
					else
					{
						//console.log("whois data len="+data.length);
						res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
						res.end(data);
					}
				});
			}
		}
	}
	else
	{
		//console.log("Unsupported method: " + req.method);
		res.end("Error! Unsupported method: " + req.method);
	}

}).listen(5001, function()
{
	console.log("server start at port 5001");
});


function startCrawling(res, address)
{
	//address = "http://"+address+"/Report?File=Fx2020.htm";

	//address="https://news.ycombinator.com";

	//console.log("koitetaan axiosta osotteella="+address);
	axios.get(address).then(response=>
	{
		//console.log("response data="+response.data);
		res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
		res.end(response.data);
	}).catch(error=>
	{
		//console.log("ERROR!="+error);
		endWithError("Axios: error! "+error,400,res);
	});



}

