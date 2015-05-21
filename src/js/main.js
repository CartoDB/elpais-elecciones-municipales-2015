var sql = new cartodb.SQL({ 
    user: 'jsanz'
  });

var selector = '.graph';
var twitterTable = 'twitter_test';
var groupDate = 'MINUTE';
var afterTime = '2015-01-01';
var partiesData = {
  '1' : {name : 'PSOE', color : '#cd1f25'},
  '2' : {name : 'Partido Popular', color : '#5ca2dc'},
  '3' : {name : 'Izquierda Unida', color : '#aa0028'},
  '4' : {name : 'Ciudadanos', color : '#fe6d2c'},
  '5' : {name : 'Podemos', color : '#593561'},
  '6' : {name : 'Union Progreso y Democracia', color : '#c3007f'}
};

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
    var date = +d3.time.format.iso.parse(twitt.date);
    values.push({
      x : +date,
      y : twitt.counts
    });
  });
  return {
    key    : partiesData[catName].name,
    color  : partiesData[catName].color,
    values : values
  }
};

/*
 NDV3 code to generate line and bar graphs
*/

function createGraph(lineClasses){

  nv.addGraph(function() {
    var chart = nv.models.lineChart()
      .margin({left: 0, right: 0, top: 0, bottom: 0})  // Adjust chart margins to give the x-axis some breathing room.
      .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
      //.transitionDuration(350)  //how fast do you want the lines to transition?
      .showLegend(false)       //Show the legend, allowing users to turn on/off line series.
      .showYAxis(false)        //Show the y-axis
      .showXAxis(true)        //Show the x-axis
      .interpolate('basis')
      .xScale(d3.time.scale());

    chart.xAxis     //Chart x-axis settings
        .tickFormat(function(d) {
              return d3.time.format('%H:%M')(new Date(d))
            });

    //chart._options.tooltipContent = function (a,b,c){return"<p>"+c+"</p>"};

    d3.select(selector)
          .append('svg')    //Select the <svg> element you want to render the chart in.   
          .datum(lineClasses)         //Populate the <svg> element with chart data...
          .call(chart);      //Finally, render the chart!

    //Update the chart when window resizes.
    nv.utils.windowResize(function() { chart.update() });  
    
    return chart;
  });// nv.addGraph
}; // Create Graph

window.onload = main;
