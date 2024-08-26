const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const request = require('request');
const zlib = require('zlib');
const csvtojson = require('csvtojson');

// Configuration
const CONNECT_KEY_ID = process.env.CONNECT_KEY_ID;
const CONNECT_PRIVATE_KEY = process.env.CONNECT_PRIVATE_KEY;
const ISSUER_ID = process.env.CONNECT_ISSUER_ID;
const API_BASE_URL = 'https://api.appstoreconnect.apple.com/v1';
const REPORT_ID = 'd5abd2d7-6c45-42a2-8683-e630d6e7eb50';

// Generate JWT Token
const generateToken = () => {
    const payload = {
        iss: ISSUER_ID,
        exp: Math.floor(Date.now() / 1000) + 60,
        aud: "appstoreconnect-v1"
    };
    const signOptions = {
        algorithm: "ES256",
        header: {
            alg: "ES256",
            kid: CONNECT_KEY_ID,
            typ: "JWT"
        }
    };
    return jwt.sign(payload, CONNECT_PRIVATE_KEY, signOptions);
};

// Create Axios client instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        Authorization: `Bearer ${generateToken()}`,
    }
});

// Handle API requests using Axios client instance
const handleRequest = async (endpoint) => {
    try {
        const response = await apiClient.get(endpoint);
        return response.data;
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
    }
};

// Read Report
const readReport = async (id) => {
    const endpoint = `/analyticsReports/${id}`;
    const data = await handleRequest(endpoint);
    if (data.data.attributes.name === 'App Crashes') {
        await readInstances(data.data.relationships.instances.links.self);
    }
};

// Read Instances
const readInstances = async (url) => {
    const data = await handleRequest(url);
    for (const instance of data.data) {
        await readInstance(instance.id);
    }
};

// Read Instance
const readInstance = async (id) => {
    const endpoint = `/analyticsReportInstances/${id}`;
    const data = await handleRequest(endpoint);
    const todayDate = getTodayDate();  // Get today's date in ISO format
    if (data.data.attributes.processingDate === todayDate) {
        await readSegments(data.data.relationships.segments.links.self);
    }
};

// Read Segments
const readSegments = async (url) => {
    const data = await handleRequest(url);
    for (const segment of data.data) {
        await readSegment(segment.id);
    }
};

// Read Segment
const readSegment = async (id) => {
    const endpoint = `/analyticsReportSegments/${id}`;
    const data = await handleRequest(endpoint);
    console.log(data.data.attributes.url);
    await downloadFile(data.data.attributes.url);
};

// Download and process file
const downloadFile = async (url) => {
    const filePath = 'out';
    return new Promise((resolve, reject) => {
        const outStream = fs.createWriteStream(filePath);
        outStream.on('finish', async () => {
            try {
                const data = fs.readFileSync(filePath, 'utf8');
                await processCSVFile(data);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
        request(url)
            .pipe(zlib.createGunzip())
            .pipe(outStream)
            .on('error', reject);
    });
};

// Process CSV file
const processCSVFile = async (data) => {
    try {
        const jsonArray = await csvtojson({ delimiter: '\t' }).fromString(data);
        const uniqueCrashes = jsonArray
            .filter(e => e.Date === '2024-08-22')  // Adjust this date as needed
            .reduce((acc, cur) => acc + Number(cur['Unique Devices']), 0);
        console.log(uniqueCrashes);
    } catch (error) {
        console.error('CSV Processing Error:', error.message);
    }
};

// Generate today's date in ISO format (YYYY-MM-DD)
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

// Main function to start the process
const main = async () => {
    try {
        const endpoint = `/analyticsReportRequests/${REPORT_ID}/reports?filter[category]=APP_USAGE`;
        const data = await handleRequest(endpoint);
        for (const report of data.data) {
            await readReport(report.id);
        }
    } catch (error) {
        console.error('Main Process Error:', error.message);
    }
};

// Start the process
main();
