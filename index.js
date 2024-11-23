Promise.all([
    d3.json('./custom.geo.json'), // Path to GeoJSON file
    d3.csv('./annual-co2-emissions-per-country.csv') // Path to CSV file
]).then(([geojson, co2Data]) => {
    // Filter CO₂ dataset for valid codes
    const filteredData = co2Data.filter(d => d.Code);

    // Precompute the min and max emissions for each country across all years
    const countryEmissionRanges = {};
    filteredData.forEach(d => {
        const code = d.Code;
        const emission = +d['Annual CO₂ emissions'];
        if (!countryEmissionRanges[code]) {
            countryEmissionRanges[code] = { min: emission, max: emission };
        } else {
            countryEmissionRanges[code].min = Math.min(countryEmissionRanges[code].min, emission);
            countryEmissionRanges[code].max = Math.max(countryEmissionRanges[code].max, emission);
        }
    });

    // Set up SVG dimensions
    const width = 960, height = 600;
    const svg = d3.select('#map').append('svg')
        .attr('width', width)
        .attr('height', height);

    // Define projection and path generator
    const projection = d3.geoMercator()
        .scale(150)
        .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    // Function to update the map based on the selected year
    function updateMap(year) {
        const yearData = filteredData.filter(d => d.Year == year);

        svg.selectAll('path')
            .data(geojson.features)
            .join('path')
            .attr('d', path)
            .attr('fill', d => {
                const countryData = yearData.find(c => c.Code === d.properties.iso_a3);
                if (countryData) {
                    const { min, max } = countryEmissionRanges[countryData.Code];
                    const emission = +countryData['Annual CO₂ emissions'];
                    // Define color scale for each country
                    const colorScale = d3.scaleLinear()
                        .domain([min, max])
                        .range(['blue', 'red']); // Customize colors if needed
                    return colorScale(emission);
                }
                return '#ccc'; // Default color for no data
            })
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5)
            .on('mouseover', (event, d) => {
                const countryData = yearData.find(c => c.Code === d.properties.iso_a3);
                d3.select('#tooltip')
                    .style('visibility', 'visible')
                    .html(countryData
                        ? `<strong>${countryData.Entity}</strong><br>Emissions: ${(+countryData['Annual CO₂ emissions']).toLocaleString()} tonnes`
                        : `<strong>${d.properties.name}</strong><br>No data`);
            })
            .on('mousemove', event => {
                d3.select('#tooltip')
                    .style('top', `${event.pageY - 10}px`)
                    .style('left', `${event.pageX + 10}px`);
            })
            .on('mouseout', () => {
                d3.select('#tooltip').style('visibility', 'hidden');
            });
    }

    // Initialize map with the latest year
    const slider = d3.select('#yearSlider');
    slider.on('input', function () {
        const year = this.value;
        d3.select('#yearLabel').text(year);
        updateMap(year);
    });
    updateMap(slider.property('value'));

}).catch(error => console.error('Error loading data:', error));

// Tooltip setup
d3.select('body')
    .append('div')
    .attr('id', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', '#fff')
    .style('padding', '8px')
    .style('border', '1px solid #ccc')
    .style('border-radius', '4px')
    .style('box-shadow', '0px 4px 6px rgba(0, 0, 0, 0.1)');