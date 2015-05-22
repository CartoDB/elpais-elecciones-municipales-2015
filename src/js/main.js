/* Coniguration block*/
// Fake data?
var isFake = false;
var vizJson = 'https://elpais.cartodb.com/u/jacintoelpais/api/v2/viz/5abd192e-0073-11e5-bad7-0e9d821ea90d/viz.json';
// User at CartoDB to retrieve the data
var sql = new cartodb.SQL({user: 'jacintoelpais'});
//  Name of the table with the tiweets
var twitterTable = 'tuits_test';
// Aggregation level to retrieve the data
// Valid values are MINUTE, HOUR, DAY, WEEK, MONTH, YEAR
var groupDate = 'DAY';
// Date since the data wants to be retrieved
var afterTime = '2015-01-01';
//  Name and colors to assign to the parties
var partiesData = {
  '1' : {name : 'PSOE', color : '#CE4039'},
  '2' : {name : 'Partido Popular', color : '#42A4DC'},
  '3' : {name : 'Izquierda Unida', color : '#539147'},
  '4' : {name : 'Ciudadanos', color : '#E08048'},
  '5' : {name : 'Podemos', color : '#4B1E5B'},
  '6' : {name : 'Union Progreso y Democracia', color : '#c3007f'}
};
// Time format for the graph, details https://github.com/mbostock/d3/wiki/Time-Formatting
var graphTimeFormat='%d/%m';
// Selector at the HTML to load the graph
var selector = '.graph';
/* End of the configuration block*/

var baseLayer = 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
var basemap;

function main() {
  var sqlStm = 'SELECT COUNT(*) counts, date_trunc(\'{{groupDate}}\',postedtime) date, category_name cat FROM ' + twitterTable + ' WHERE postedtime > \'{{afterTime}}\'::DATE GROUP BY 2,3 ORDER BY 2,3 ASC';

  sql.execute(sqlStm,{groupDate : groupDate, afterTime : afterTime })
    .done(function(twitterData){
      sql.execute('SELECT DISTINCT(category_name) cat FROM ' + twitterTable + ' ORDER BY category_name')
        .done(function(catsData){
            var lineClasses = [];
            catsData.rows.forEach(function(catRow){
              var catName = catRow.cat;
              lineClasses.push(
                lineData(
                  catName,
                  twitterData.rows.filter(function(twiterRow){
                    return twiterRow.cat == catName
                  })
                )
              );
            });
            // ready to call the graph constructor
            createGraph(lineClasses);
        })
        .error(logErrors);
    })
  .error(logErrors);
}

function logErrors(errors){
  console.log(errors);
}

function lineData(catName, twitterData){
  var values = [];
  twitterData.forEach(function(twitt){
    //var date = +d3.time.format.iso.parse(twitt.date);
    var date = new Date(twitt.date);
    var y = twitt.counts;
    if (isFake){
      y = y + Math.floor(y*Math.random() * Math.floor((Math.random()*2-1)));
    }
    values.push({
      x : date,
      y : y
    });
  });
  return {
    key    : partiesData[catName].name,
    color  : partiesData[catName].color,
    values : values,
    area   : true
  }
};

/*
 NDV3 code to generate line and bar graphs
*/

function createGraph(lineClasses){
    nv.addGraph(function() {

    var chart = nv.models.lineChart()
      .margin({left: 0, right: 0, top: 0, bottom: 0})  // Adjust chart margins to give the x-axis some breathing room.
      //.useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
      //.transitionDuration(350)  //how fast do you want the lines to transition?
      .interactive(false)
      .showLegend(false)       //Show the legend, allowing users to turn on/off line series.
      .showYAxis(false)        //Show the y-axis
      //.showXAxis(false)        //Show the x-axis
      .interpolate('basis')
      //.xScale(d3.time.scale())
      ;

    chart.xAxis     //Chart x-axis settings
        .tickFormat(function(d) {
              return d3.time.format(graphTimeFormat)(new Date(d))
            });

    //chart._options.tooltipContent = function (a,b,c){return false};

    d3.select(selector)
          .append('svg')    //Select the <svg> element you want to render the chart in.
          .datum(lineClasses)         //Populate the <svg> element with chart data...
          .call(chart);      //Finally, render the chart!

    //initialize a vertical bar on the chart that will indicate current time
    var verticalBar = d3.select('svg')
      .append("line")
      .attr("x1", chart.margin().left)
      .attr("y1", chart.margin().top-5)
      .attr("x2", chart.margin().left)
      .attr("y2", 130)
      .attr("class","verticalLine");

    //Update the chart when window resizes.
    nv.utils.windowResize(function() { chart.update() });

    createMap(verticalBar,chart);
    return chart;
  });
}; // Create Graph

function createMap(verticalBar,chart){

  cartodb.createVis('map', vizJson, {
      title: false
  })
  .done(function(vis, layers) {
    basemap = layers[0];
    basemap.setUrl(baseLayer);
    layers[1]
      .on('featureOver', function(e, latlng, pos, data) {
        cartodb.log.log(e, latlng, pos, data);
      })
      .on('change:time', function(changes) {
          //update the vertical bar
          if (verticalBar && chart){
            verticalBar.attr(
              "x1",
              chart.xAxis.scale()(new Date(changes.time))+chart.margin().left
            )
            .attr(
              "x2",
              chart.xAxis.scale()(new Date(changes.time))+chart.margin().left)
          }
      });
    // you can get the native map to work with it
    var map = vis.getNativeMap();
  })
  .error(function(err) {
    console.log(err);
  });
}




$( document ).ready(function() {

  // Base layer switcher
  $( "#white" ).click(function() {
    var baseLayer = 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
    basemap.setUrl(baseLayer);
    $( '.tabs > li a' ).toggleClass( "is-active" );
  });
  $( "#dark" ).click(function() {
    var baseLayer = 'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    basemap.setUrl(baseLayer);
    $( '.tabs > li a' ).toggleClass( "is-active" );
  });

  main();
});
