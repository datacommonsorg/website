function drawChart(container, data){
    const barHeight = 35;
    const margin = { top: 70, right: 50, bottom: 10, left: 50 };
    const height = 400 - margin.top - margin.bottom;
    const width = 460 - margin.left - margin.right;
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.value)])
        .range([margin.left, width - margin.right]);
    const y = d3.scaleBand()
        .domain(d3.range(data.length))
        .rangeRound([margin.top, height - margin.bottom])
        .padding(0.1);
    function formatTick(d) {
        if (d == 0) {
            return "NotDetected";
        } else if (d == 1) {
            return "Low";
        } else if (d == 2) {
            return "Medium";
        } else {
            return "High";
        }
        };
    const svg = d3.select(container).append('svg')
        .attr("viewBox", [0, 0, width, height]);
    
    svg.append("g")
        .selectAll("rect")
        .data(data.sort((a, b) => d3.descending(a.value, b.value)))
        .join("rect")
        .attr("x", x(0))
        .attr("y", (d, i) => y(i))
        .attr("width", (d) => x(d.value) - x(0))
        .attr("height", y.bandwidth())
        .style("fill", function (d) {
            if (d.name == "Eye") {
            return "green";
            } else if (d.name == "Cartilage") {
            return "yellow";
            } else if (d.name == "Liver") {
            return "steelblue";
            } else {
            return "red";
            }
        })
        .on("mouseover", function (d, i) {
            d3.select(this).transition().duration("50").style("opacity", 0.5);
        })
        .on("mouseout", function (d, i) {
            d3.select(this).transition().duration("50").style("opacity", 1);
        });
    
    svg.append("g")
        .attr("fill", "white")
        .attr("text-anchor", "end")
        .attr("font-family", "sans-serif")
        .attr("font-size", 3)
        .selectAll("text")
        .data(data.sort((a, b) => d3.descending(a.value, b.value)))
        .join("text")
        .attr("x", (d) => x(d.value))
        .attr("y", (d, i) => y(i) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("dx", -4)
        .call((text) =>
            text
            .filter((d) => x(d.value) - x(0) < 20) // short bars
            .attr("dx", +2)
            .attr("fill", "black")
            .attr("text-anchor", "start")
        );

    svg.append("g")
        .attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(x).ticks(3).tickFormat(formatTick))
        .call((g) => g.select(".domain").remove())
        .on("mouseover", function () {
            d3.select(this).select("rect").style("fill", "red");
        })
        .on("mouseout", function (d, i) {
            d3.select(this).select("rect").style("fill", "blue");
        });

        svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(
            d3
            .axisLeft(y)
            .tickFormat((i) => data[i].name)
            .tickSizeOuter(0)
        )
        .on("mouseover", function () {
            d3.select(this).select("rect").style("fill", "red");
        })
        .on("mouseout", function (d, i) {
            d3.select(this).select("rect").style("fill", "blue");
        });
    
    
 }