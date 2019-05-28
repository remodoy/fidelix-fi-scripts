var http = require('http');
var url = require('url'); // access url variables
var webdriver = require('selenium-webdriver'), By = webdriver.By, until = webdriver.until;
var firefox = require('selenium-webdriver/firefox');

// kopiointi nodejs-projektikansioon:
// sudo cp /Users/jarkkomatilainen/Desktop/_fidelix_hae_yhteystiedot/index.js index.js




var req2 = null;
var res2 = null;
http.createServer(function (req, res)
{
  req2 = req;
  res2 = res;
	console.log("____METHOD: "+req.method+"____");
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
		var hakusana = urlVariables.hakusana;
		if (hakusana == null)
		{
			endWithError("error! no url variable named 'hakusana'!",400);
		}
		else
		{
      
            // ALOITETAAN HAKUSANAN MUOKKAUS
            var hakusanaModified = "";

            // VAIHE 1: LISÄTÄÄN ALAVIIVAT KIRJAINTEN JA NUMEROIDEN VÄLIIN
            for (var i = 0; i < hakusana.length; i++)
            {
                var c = hakusana[i];
                var a = hakusana.charCodeAt(i);
                var onkoNumero1 = (a >= 48 && a <= 57);
                var onkoNumero0 = onkoNumero1;
                if (i > 0) onkoNumero0 = (hakusana.charCodeAt(i-1) >= 48 && hakusana.charCodeAt(i-1) <= 57);
                if (onkoNumero0 != onkoNumero1) hakusanaModified +="_";
                hakusanaModified += c;
            }

            // VAIHE 2: SPLITATAAN ALAVIIVOJEN KOHDALTA
            hakusanaModified = hakusanaModified.split("_");
            hakusana = hakusanaModified;

            // VAIHE 3: POISTETAAN SANAYHDISTELMÄT AK+NUMERO JA VAK+NUMERO
            for (var i = 0; i < hakusana.length - 1; i++)
            {
                if (hakusana[i] == "AK")
                {
                    var seuraava = hakusana[i + 1];
                    var seuraavaOnNumero = true;
                    for (var ii = 0; ii < seuraava.length; ii++)
                    {
                        if (seuraava.charCodeAt(ii) < 48 || seuraava.charCodeAt(ii) > 57) seuraavaOnNumero = false;
                    }
                    if (seuraavaOnNumero)
                    {
                        hakusana[i] = "";
                        hakusana[i + 1] = "";
                    }
                }
                if (hakusana[i] == "VAK")
                {
                    var seuraava = hakusana[i + 1];
                    var seuraavaOnNumero = true;
                    for (var ii = 0; ii < seuraava.length; ii++)
                    {
                        if (seuraava.charCodeAt(ii) < 48 || seuraava.charCodeAt(ii) > 57) seuraavaOnNumero = false;
                    }
                    if (seuraavaOnNumero)
                    {
                        hakusana[i] = "";
                        hakusana[i + 1] = "";
                    }
                }
        }

            // VAIHE 4: YHDISTETÄÄN JÄLJELLE JÄÄNEET SANAT
            hakusanaModified = "";
            for (var i = 0; i < hakusana.length; i++)
            {
                if (hakusana[i] != "" && hakusana[i].length > 0)
                {
                    hakusanaModified += hakusana[i];
                    if (i < hakusana.length - 1) hakusanaModified += "+";
                }
            }

 
            //endWithError("["+hakusanaModified+"]",201); // TESTI
            aloitaHaku(hakusanaModified);
		}
	}
	else
	{
		console.log("Unsupported method: " + req.method);
		res.end("Error! Unsupported method: " + req.method);
	}

}).listen(5002, "localhost", function()
{
	console.log("server start at port 5002");
});


var poistuttuGooglesta = false;
var options = new firefox.Options();
//options.addArguments("-headless"); // tee selaimesta näkymätön
var driver = null;


function endWithError(message, responseValue)
{
  //if (driver != null) {driver.quit(); driver = null;}
	console.log(message);
	res2.writeHead(responseValue, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
	res2.end(message);
}

function endSuccessfully()
{
  //if (driver != null) {driver.quit(); driver = null;}
  res2.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
  res2.end(yhteysTiedot);
}

function aloitaHaku(hakusana)
{
  if (driver==null) driver = new webdriver.Builder().forBrowser('firefox').setFirefoxOptions(options).build();
  poistuttuGooglesta = false;
  yhteysTiedot = "";
  var hakuosoite = "https://www.google.com/search?q="+hakusana+"+asiakastieto";
  //console.log("aloitetaan haku: "+hakuosoite+"   driver="+driver);
  lataaSivu(hakuosoite);
}



function lataaSivu(hakuosoite) // tehdään google-haku
{
    //console.log("lataasivu");
    driver.get(hakuosoite).then(odotaLatautuminen)
    .catch(function(error){endWithError("lataaSivu:"+error,400);});
    
}

function odotaLatautuminen()
{
    //console.log("odotaLatautuminen");
    driver.sleep(1000).then(etsiLinkit)
    .catch(function(error){endWithError("odotaLatautuminen:"+error,400);});
}


function etsiLinkit() // listataan kaikki linkit google-sivulla haun jälkeen
{
    //console.log("etsitään linkit!");
    driver.findElements(webdriver.By.tagName("a")).then(function(elems)
    {
        if (elems.length == 0 || elems.length == null) endWithError("no results!",400);
        for (var i = 0; i < elems.length; i++) tarkastaSisalto(elems[i], i);
    })
    .catch(function(error){endWithError("etsiLinkit:"+error,400);});
}

function tarkastaSisalto(elem, indeksi) // valitaan se linkki jossa on sana "Asiakastieto"
{
    elem.getAttribute("innerHTML").then(function(value)
    {
        //console.log("tarkistetaan linkki! "+value);
        var linkinHakusana = "Asiakastieto";
        var i = value.search(linkinHakusana);
        if (i >= 0)
        {
            if (!poistuttuGooglesta)
            {
                poistuttuGooglesta = true;
                sivuAsiakastietoFi(elem);
            }
        }
    })
    .catch(function(error){endWithError("tarkastaSisalto:"+error,400);});
}


// mitä tehdään sivustolla asiakastieto.fi:
var yhteysTiedot = "";
var osoiteFound = false;
function sivuAsiakastietoFi(elem)
{
   yhteysTiedot += "Asiakastieto.fi"+" ";
   console.log("yhteysTiedot nyt="+yhteysTiedot);
   elem.click().then(function()
    {
        driver.sleep(4000).then(function()
        {
            // VAIHE 1: ETSITÄÄN YRITYKSEN NIMI (LÖYTYY H1-ELEMENTISTÄ)
            driver.findElements(By.tagName('h1')).then(function(elems)
            {
              console.log("etsitään yritystä...");
                for (var i = 0; i < elems.length; i++) elems[i].getAttribute("innerText").then(function(yrityksenNimi)
                {
                    yhteysTiedot += yrityksenNimi + " ";
                    console.log("yhteysTiedot nyt="+yhteysTiedot);
                })
                .catch(function(error){endWithError("class:"+error,400);});
            })
            .catch(function(error){console.log("h1:"+error);});

            // VAIHE 2: ETSITÄÄN KAIKKI "dd"-ELEMENTIT JA NIISTÄ PUHELINNUMERO JA OSOITETIEDOT
            driver.findElements(By.tagName('dd')).then(function(elems)
            {
                // VAIHE 2a) PUHELINNUMERO
                console.log("dd len="+elems.length);
                if (elems.length == 0) endSuccessfully(yhteystiedot);
                for (var i = 0; i < elems.length; i++)
                {
                    
                    elems[i].getAttribute("innerHTML").then(function(puhelinNumerot)
                    {
                      //console.log("etsitään puhelinnumeroa..."+puhelinNumerot);
                      var linkinHakusana = "tel";
                      var i = puhelinNumerot.search(linkinHakusana);
                      if (i >= 0)
                      {
                          var sanat = puhelinNumerot.split("\"");
                          var puhelinNumero = sanat[3];
                          console.log(puhelinNumero);
                          yhteysTiedot += puhelinNumero + " ";
                          console.log("yhteysTiedot nyt="+yhteysTiedot);

                      }
                    })
                    .catch(function(error){endWithError("dd innerHTML:"+error,400);});
                    
                }

                // VAIHE 2b) OSOITETIEDOT
                driver.findElements(By.tagName('dl')).then(function(elems)
                {
                    for (var i = 0; i < elems.length; i++)
                    {
                        if (!osoiteFound) elems[i].getAttribute("innerHTML").then(function(osoiteInnerHtml)
                        {
                            var kaynti_i = osoiteInnerHtml.search("Käyntiosoite");
                            var posti_i = osoiteInnerHtml.search("Postiosoite");
                            if (kaynti_i >= 0)
                            {
                                var kayntiSub = osoiteInnerHtml.substring(kaynti_i, osoiteInnerHtml.length);
                                var alku = kayntiSub.search("<dd>") + 4;
                                var loppu = kayntiSub.search("</dd>");
                                if (alku > 0 && loppu > 0 && loppu > alku)
                                {
                                    var osote1 = "Käyntiosoite: " + kayntiSub.substring(alku, loppu) + " ";
                                    yhteysTiedot += osote1;
                                    console.log(osote1);
                                }
                                console.log(kayntiSub.substring(alku, loppu));
                            }
                            if (posti_i >= 0)
                            {
                                var postiSub = osoiteInnerHtml.substring(posti_i, osoiteInnerHtml.length);
                                var alku = postiSub.search("<dd>") + 4;
                                var loppu = postiSub.search("</dd>");
                                if (alku > 0 && loppu > 0 && loppu > alku)
                                {
                                    var osote2 = "Postiosoite: " + postiSub.substring(alku, loppu) + " ";
                                    yhteysTiedot += osote2;
                                    console.log(osote2);
                                }
                            }
                        })
                        .catch(function(error){endWithError("kayntiosoite:"+error,400);});
                    }
                })
                .catch(function(error){endWithError("dl:"+error,400);});

                // VAIHE 3: LOPETA ETSINTÄ 2 SEKUNTIN PÄÄSTÄ
                setTimeout(endSuccessfully, 2000);

            })
            .catch(function(error){endWithError("h1:"+error,400);});
         })
         .catch(function(error){endWithError("sleep:"+error,400);});
    })
    .catch(function(error){endWithError("sivuAsiakastietoFi:"+error,400);});

}

