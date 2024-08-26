const fs   = require('fs');
const jwt  = require('jsonwebtoken');
const axios = require('axios');
const request = require('request');
const zlib = require('zlib');
const csvtojson = require('csvtojson');

const token = () => {
    let payload = {
        "iss": process.env.CONNECT_ISSUER_ID,
        "exp": Math.round((new Date()).getTime() / 1000 + 60),
        "aud": "appstoreconnect-v1"
    }
    let signOptions = {
        "algorithm": "ES256",
        header : {
            "alg": "ES256",
            "kid": CONNECT_KEY_ID,
            "typ": "JWT"
        }
    };
    return jwt.sign(payload, process.env.CONNECT_PRIVATE_KEY, signOptions);
}

const config = {
    headers: {
        Authorization: `Bearer ${token}`
    }
}

const readInstances = url => {
    console.log(url)
    axios.get(url, config)
        .then(res => {
            console.log(res.data.data)
            // readInstance(res.data.data[0].id)
            res.data.data.forEach(i => {
                readInstance(i.id)
            })
        })
        .catch(err => {
            console.log(err.response.data)
        })
}

const readInstance = id => {
    axios.get(`https://api.appstoreconnect.apple.com/v1/analyticsReportInstances/${id}`, config)
        .then(res => {
            if(res.data.data.attributes.processingDate == "2024-08-25") {
                readSegments(res.data.data.relationships.segments.links.self)
            }
        })
        .catch(err => {
            console.log(err.response.data)
        })
}

const readSegments = url => {
    axios.get(url, config)
        .then(res => {
            // console.log(res.data.data[0].id)
            // readSegment(res.data.data[0].id)
            res.data.data.forEach(s => {
                readSegment(s.id)
            })
        })
        .catch(err => {
            console.log(err.response.data)
        })
}

const readSegment = id => {
    axios.get(`https://api.appstoreconnect.apple.com/v1/analyticsReportSegments/${id}`, config)
        .then(res => {
            console.log(res.data.data.attributes.url)
            downloadFile(res.data.data.attributes.url)
        })
        .catch(err => {
            console.log(err.response.data)
        })
}

const downloadFile = async url => {
    let out = fs.createWriteStream('out');
    out.on('finish', () => {
      fs.readFile('out', 'utf8', (err, data) => {
          if (err) {
            console.error(err);
            return;
          }
        csvtojson({delimiter: '\t'})
          .fromString(data)
          .then((jsonObj)=>{
                const uniqueCrashes = jsonObj
                    .filter(e => e.Date === '2024-08-22')
                    .reduce((acc, cur) => acc + Number(cur['Unique Devices']), 0)
                console.log(uniqueCrashes)
          });
        })
    });
    request(url).pipe(zlib.createGunzip()).pipe(out);
}

const readReport = id => {
    axios.get(`https://api.appstoreconnect.apple.com/v1/analyticsReports/${id}`, config)
        .then(res => {
            // console.log(res.data.data)
            // if (res.data.data.attributes.category == 'APP_USAGE')
                // console.log(res.data.data.attributes.name)
            if (res.data.data.attributes.name === 'App Crashes') {
                readInstances(res.data.data.relationships.instances.links.self)

                // console.log(res.data.data)
                // console.log(res.data.data.relationships.instances)
                
                // console.log(res.data.data.attributes.name)
            }
        })
        .catch(err => {
            console.log(err.response.data)
        })
}

axios.get('https://api.appstoreconnect.apple.com/v1/analyticsReportRequests/d5abd2d7-6c45-42a2-8683-e630d6e7eb50/reports?filter[category]=APP_USAGE', config)
    .then(res => {
        // console.log(res.data.data)
        res.data.data.forEach(report => {
            readReport(report.id)
        })
    })
    .catch(err => {
        console.log(err.response.data)
    })

