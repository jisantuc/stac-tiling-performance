STAC Tiling Performance Test
=====

This repo will hold software and sample data to compare STAC dynamic raster tile services.
It's starting with [`titiler`](https://github.com/developmentseed/titiler) and [Franklin](https://github.com/azavea/franklin)
because those are the easiest two implementations to set up. If there are tiling implementations I've missed that you think
should be included, please [open an issue](https://github.com/jisantuc/stac-tiling-performance/issues/new?template=tiling-implementation.md).

Setup
-----

To initialize services with all the data you'll need to run the tests, you can run
`scripts/load-data`. This will create a collection using the json in
`data/collection.json` and an item in that collection using the json in
`data/item-1.json`.

Testing
----

To run the performance test, you can run `scripts/test`. This script runs the
`harness.js` script [locally in the `k6` container image](https://k6.io/docs/getting-started/running-k6/#running-local-tests).

Visualizing results
-----

To visualize results, you can bring up the `grafana` container the test compose file, like:

```bash
docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d grafana
```

Then you'll need to [add a datasource](https://grafana.com/docs/grafana/latest/datasources/add-a-data-source/)
for the Influx service defined in the test compose file. With that datasource,
you can run ad hoc queries over the test results. Any published visualizations
based on these data will include their Grafana queries.