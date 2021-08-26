import http from "k6/http";
import { check, fail, group, sleep } from "k6";

if (!__ENV.HAR_FILE) fail("HAR_FILE must be set!");

export const options = {
  vus: 20,
  duration: "2m",
  discardResponseBodies: true,
  maxRedirects: 0,
  ext: {
    loadimpact: {
      projectID: __ENV.K6_PROJECT_ID,
      // Test runs with the same name groups test runs together
      name: __ENV.TEST_NAME,
    },
  },
};

const har = JSON.parse(open(`./${__ENV.HAR_FILE}`));

function titilerize(url) {
  const extractor = new RegExp(
    /^.*tiles\/collections\/([a-z\-]+)\/items\/([a-z0-9\+]+)\/WebMercatorQuad\/([0-9]+)\/([0-9]+)\/([0-9]+)\/.*$/
  );
  const [_, collection, item, z, x, y] = url.match(extractor);
  const stacItemUrl = encodeURI(`http://franklin.service.internal:9090/collections/${collection}/items/${item}`);
  return `http://titiler.service.internal:8000/stac/tiles/WebMercatorQuad/${z}/${x}/${y}?url=${stacItemUrl}&assets=data-http`;
}

export function setup() {
  const requests = {};

  har.log.entries.forEach((entry) => {
    const startedDateTime = new Date(entry.startedDateTime);
    const tilingBackend = __ENV.TILING_BACKEND || "franklin";
    startedDateTime.setMilliseconds(0);

    const url = tilingBackend.toLowerCase() === "titiler"
      ? titilerize(entry.request.url)
      : entry.request.url.replace("localhost", "franklin.service.internal");

    // We want to batch requests that occured within the same second
    const batchTime = startedDateTime.getTime();

    if (!requests.hasOwnProperty(batchTime)) {
      requests[batchTime] = [];
    }

    requests[batchTime].push([
      entry.request.method,
      url,
      null,
      {
        tags: { serviceName: franklin ? "Franklin" : "TiTiler" },
      },
    ]);
  });

  // Sort requests in ascending order
  let batches = Object.keys(requests);
  batches = batches.sort((a, b) => a - b);

  // Return a list of batches, and a map of batches to requests
  return [batches, requests];
}

export default (data) => {
  const batches = data[0];
  const requests = data[1];

  group(__ENV.HAR_FILE, () => {
    for (var i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const nextBatch = batches[i + 1];

      const responses = http.batch(requests[batch]);

      responses.forEach((res) => {
        check(res, {
          "is status 200": (r) => r.status === 200,
        });
      });

      // If there's another batch of requests, sleep for the appropriate duration
      if (nextBatch) {
        sleep(Math.floor((nextBatch - batch) / 1000));
      }
    }
  });
};
