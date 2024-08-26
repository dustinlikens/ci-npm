const fs   = require('fs');
const jwt  = require('jsonwebtoken');
const axios = require('axios');
// const extract = require('extract-zip');
var request = require('request'),
    zlib = require('zlib'),
    out = fs.createWriteStream('out');
const csvtojson = require('csvtojson');

// You get privateKey, apiKeyId and issuerId from your Apple App Store Connect account
const privateKey = fs.readFileSync("./AuthKey_HH6HB28U53.p8") // this is the file you can only download once and should treat like a real, very precious key.
const apiKeyId = "HH6HB28U53"
const issuerId = "69a6de78-79cd-47e3-e053-5b8c7c11a4d1"
let now = Math.round((new Date()).getTime() / 1000); // Notice the /1000
let nowPlus20 = now + 1199 // 1200 === 20 minutes

let payload = {
    "iss": issuerId,
    "exp": nowPlus20,
    "aud": "appstoreconnect-v1"
}

let signOptions = {
    "algorithm": "ES256", // you must use this algorythm, not jsonwebtoken's default
    header : {
        "alg": "ES256",
        "kid": apiKeyId,
        "typ": "JWT"
    }
};

let token = jwt.sign(payload, process.env.CONNECT_PRIVATE_KEY, signOptions);

const config = {
    headers: {
        Authorization: `Bearer ${token}`
    }
}

// 1484133667 app id

// const data = {"data": {
//     "type": "analyticsReportRequests",
//     "attributes": {
//           "accessType": "ONGOING"
//     },
//     "relationships": {
//       "app": {
//         "data": {
//           "type": "app",
//           "id": "1484133667"
//         }
//       }
//     }
//   }
// }

const data = {
  "data": {
    "type": "analyticsReportRequests",
    "attributes": {
          "accessType": "ONGOING"
    },
    "relationships": {
      "app": {
        "data": {
          "type": "apps",
          "id": "1484133667"
        }
      }
    }
  }
}

// axios.post('https://api.appstoreconnect.apple.com/v1/analyticsReportRequests ', data, config)
//     .then(res => {
//         console.log(res.data.data)
//     })
//     .catch(err => {
//         console.log(err.response.data)
//     })

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
    request(url).pipe(zlib.createGunzip()).pipe(out);

    out.on('finish', () => {
      console.log('File write complete.');

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

    // csvtojson()
    //   .fromString(out)
    //   .then((jsonObj)=>{
    //     console.log(jsonObj);
    //   });
    // console.log(out)
    // axios({
    //     method: "get",
    //     url: url,
    //     responseType: "blob"
    // }).then(async function (res) {
    //     extract(res.data)
    //     await extract(res.data, __dirname);
    // });
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

const filterReports = () => {
    axios.get(`https://api.appstoreconnect.apple.com/v1/analyticsReportRequests/1484133667/reports?filter[category]=APP_USAGE`, config)
        .then(res => {
            console.log(res.data.data)
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

// axios.get('https://api.appstoreconnect.apple.com/v1/apps/1484133667/analyticsReportRequests', config)
//     .then(res => {
//             console.log(res.data.data[0].relationships.reports)
//         })
//         .catch(err => {
//             console.log(err.response.data)
//         })



// filterReports()


// axios.get('https://api.appstoreconnect.apple.com/v1/analyticsReports/r39-d5abd2d7-6c45-42a2-8683-e630d6e7eb50', config)
//     .then(res => {
//         console.log(res.data)
//     })
//     .catch(err => {
//         console.log(err.response.data)
//     })


// console.log(token)
