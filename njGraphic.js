function njGraphic($div, options){
    
    /***
     * @var self
     */
    var self = this;
    
    /***
     * @var $div
     * @description: jQuery Selector
     */
    this.$self = $div;
    
    /***
     * @var previewMode
     * @description: preview. or www. ?
     */
    this.previewMode = false;
    
    /***
     * @var options
     * @description: Namespaced global vars from njHelper.njgraphicInit
     */
    this.options = options;
    
    /***
     * @function: init
     * @description: Check if the D3 lib has been called
     */
    this.init = function(){
        // Load D3 for first time
        if (typeof d3 == "undefined"){
            $.ajax({
                async: false,
                url: '/js/libs/d3/d3.min.js',
                dataType: 'script',
                success: function(){
                    self.setParams();
                },
                error: function(e){
                    //console.log(e)
                    throw 'could not load d3';
                }
            });
        } else
            self.setParams();
            
        // Load topojson for first map
        if (typeof topojson == "undefined"){
            $.ajax({
                async: false,
                url: '/js/libs/d3/topojson.min.js',
                dataType: 'script',
                complete: function(){
                    
                }
            });
        }
        
        self.previewMode = self.$self.data() && self.$self.data().previewenabled;
        
        if (self.options.interactive) {
            $(document).on("click touchstart", '#'+self.options.id+" .hoverAction", function(e){
                if ($('#njGraphichoverActionDisplay').length){
                    $('#njGraphichoverActionDisplay').remove();
                    $('#njGraphichoverActionDisplay').unbind('clickoutside touchstartoutside');
                }

                var html = '';
                html+= '<div id="njGraphichoverActionDisplay">'
                html+=      $(this).data().hover;
                html+= '</div>'
                $('#'+self.options.id).append(html);
                var offset = $(this).offset();
                $('#njGraphichoverActionDisplay').css({
                    top: offset.top,
                    left: offset.left
                });
                
                $('#'+self.options.id).bind('click', function(){
                    $('#'+self.options.id).unbind('click');
                    $('#njGraphichoverActionDisplay').remove();
                });
            });
        }
    }
    /***/
    
    /***
     * @function: getData
     * @description: Import formatted data from URL
     */
    this.getData = function(callback){
        var url = '';
        var data = {};
        //TODO!!! dataType set here since raw is not yet an option in Nstein.
        //Should be passed with other data when set
        if(typeof self.options.dataType === 'undefined')
        {
            self.options.dataType = 'google';    
        }
        // Format options
        var sortBy = 'groups';
        if (self.options.type == "bar")
            sortBy = 'names';
        else if (self.options.type == "map")
            sortBy = 'map';
        
        // Set URL (and data)
        switch (self.options.dataType) {
            case "google":
                url = '/graphic/getGoogleSpreadsheet';
                data.key = self.options.src;
                data.sort = sortBy;
                break;
            case "raw":
                url = '/graphic/getRawData';
                data.key = self.options.src;
                break;
        }
        
        // Construct load elements
        var progress = 0,
            twoPi = 2 * Math.PI,
            formatPercent = d3.format(".0%"),
            arc = d3.svg.arc()
                .startAngle(0)
                .innerRadius(100)
                .outerRadius(125),
            load = d3.select("#"+self.options.graph+" svg").append('g')
                .attr("class", 'load')
                .attr("transform", 'translate('+self.parameters.width/2+','+self.parameters.height/2+')'),
            progressPath = load.append('path')
                .attr("d", arc.endAngle(twoPi * 0.01)),
            text = load.append("text")
                .attr("dy", '.35em')
                .text('Graphing... (0%)');
        
        // AJAX eventsconsole.log(d);
        $.ajax({
            xhr: function(){
                // Show progress of data call
                var loading = new window.XMLHttpRequest();
                loading.addEventListener("progress", function(evt){
                    if (evt.lengthComputable) {
                      var i = d3.interpolate(progress, evt.loaded / evt.total);
                      d3.transition().tween("progress", function() {
                        return function(t) {
                          progress = i(t);
                          progressPath.attr("d", arc.endAngle(twoPi * progress));
                          text.text('Graphing... ('+formatPercent(progress)+')');
                        };
                      });
                    }
                }, false);
                return loading;
            },
            url: url,
            data: data,
            dataType: 'json',
            //success: callback,
            success:callback,
            error: function(e){
                console.log(e);
                progressPath.attr("d", arc.endAngle(360));
                text.text('Error loading data');
            } 
        })
    }
    /***/
    
    /***
     * @function: setParams
     * @description: Set self.namespaced global vars
     */
    this.setParams = function(){
        if (!self.options)
            throw 'no options';
        
        var baseHeight = 500;
        if(self.options.tableheight){
            baseHeight = self.options.tableheight;   
        }
        
        var baseWidth = $('#'+self.options.graph).width();
        if(self.options.tablewidth){
            baseWidth = self.options.tablewidth;
            this.$self.css('width', self.options.tablewidth);
        }
        
        var hex = ["d6d0c8", "fdeb95", "9dbfb9", "9a8a77", "ffd400", "00473b", "b5a99b", "c37a01", "629a90", "e7e3df"];
        //TODO!!! POLITICAL COLORS
        //var hex = ["0d80d1", "ee1c25"];
        
        //var partyScale = ["++", "+", "", "-", "--", "3rd", "dem++", "dem+", "dem", "dem-", "dem--", "rep++", "rep+", "rep", "rep-", "rep--"];
        var partyScale = ['Undecided', 'Undecided', 'Undecided', 'Undecided', 'Undecided', 'Independent/3rd Party', 'Democratic', 'Democrat', 'Democratic', 'Democratic', 'Democratic', 'Republican', 'Republican', 'Republican', 'Republican', 'Republican'];
        if (self.options.type == "map")
            baseHeight = baseWidth * 0.6;
        this.div = d3.select("#"+self.options.graph);
        this.parameters = {
            url: 'https://spreadsheets.google.com/feeds/list/'+self.options.src+'/od6/public/values?alt=json',
            areaWidth: baseWidth,
            areaHeight: baseHeight + self.options.height,
            width: baseWidth - self.options.margin.left - self.options.margin.right,
            height: baseHeight + self.options.height - self.options.margin.top - self.options.margin.bottom,
            margin: {
                top: self.options.margin.top,
                right: self.options.margin.right,
                bottom: self.options.margin.bottom,
                left: self.options.margin.left
            },
            hex: hex,
            colors: d3.scale.ordinal().range(hex),
            partyColors: d3.scale.ordinal().domain(partyScale).range(['#7b6c59', '#9a8a77', '#b5a99b', '#d6d0c8', '#e7e3df', '#ffd400', '#022742', '#145686', '#0d80d1', '#76b6e4', '#c8deec', '#480105', '#942128', '#ee1c25', '#eb8185', '#dec8ca']),
            partyNames: d3.scale.ordinal().domain(partyScale).range(['Undecided', 'Undecided', 'Undecided', 'Undecided', 'Undecided', 'Independent/3rd Party', 'Democratic', 'Democratic', 'Democratic', 'Democratic', 'Democratic', 'Republican', 'Republican', 'Republican', 'Republican', 'Republican']),
            commas: d3.format(",.0f"),
            ratingpercent: d3.format(",.1f"),
            letters: d3.format(".2s"),
            letterBoundary: 100000,
            integerL: function(d) { if(d == null) return '(No data available)'; else return ''+self.parameters.letters(d).toUpperCase(); },
            dollarsC: function(d) { return '$'+self.parameters.commas(d); },
            dollarsL: function(d) { if(d == null) return'(No data available)'; else return '$'+self.parameters.letters(d).toUpperCase(); },
            percent: function(d) {  if(d == 0) return '0%'; else return self.parameters.ratingpercent(d)+'%'; }
        };
        
        this.parameters.politicalPartyColors = {
            'republican': "#ee1c25",
            'democrat': "#0d80d1",
            'other': '#7b6c59'
        };
        
        this.parameters.politicalPartyColorsVar = {
            'republican': ['#ee1c25', '#952026', '#eb8185', '#480105', '#dec8ca'],
            'democrat': ['#0d80d1', '#145686', '#76b6e4', '#022742', '#c8deec'],
            'other': ['#ffd401', '#d19123', '#fdec9a', '#875705', '#f5eed1'],
            'none': ['#D2D2D2']
        };
        
        this.parameters.politicalPartyHeatMapColors = {
            'republican': ['#dec8ca', '#eb8185', '#ee1c25', '#952026', '#480105'],
            'democrat': ['#c8deec', '#76b6e4', '#0d80d1', '#145686', '#022742'],
            'other': ['#f5eed1', '#fdec9a', '#ffd401', '#d19123', '#875705']
        };
        
        this.parameters.sponsoredApi = {
            'default': '#949498', 
            '1': '#ffd400'
        };
        
        this.parameters.khakiColor = {
            'default': "#E7E3DF"
        };
        var rtColors = [
                "b5a99b",
                "629a90",
                "c37a01",
                "51195a",
                "d6d0c8",
                "00473b",
                "fdeb95",
                "c8a6ce",
                "9a8a77",
                "ccebe5",
                "ffd400",
                "945c9d",
                "e7e3df",
                "9dbfb9",
                "fff5c3",
                "e9dceb"];
        this.parameters.rtColors = rtColors;
        this.parameters.raceTrackerColors = d3.scale.ordinal().range(rtColors);
        
        var rbColors = ['649B92', '08473B', 'C0791D'];
        this.parameters.rbColors = rbColors;
        this.parameters.raceBarColors = d3.scale.ordinal().range(rbColors);
        
        var rpColors = ['649B92', 'FED331', 'E7E4DF', '08473B', '9A8B79', 'C0791D'];
        this.parameters.rpColors = rpColors;
        this.parameters.racePieColors = d3.scale.ordinal().range(rpColors);
        
        var rlColors = ['C0791D', '649B92', '08473B', 'FED331', 'E7E4DF', '9A8B79'];
        this.parameters.rlColors = rlColors;
        this.parameters.raceLineColors = d3.scale.ordinal().range(rlColors);
        
        var sectorColors = ['9A8B79', 'FED331', '9DBFB9', 'D7D0C8'];
        this.parameters.sectorColors = sectorColors;
        this.parameters.sGraphColors = d3.scale.ordinal().range(sectorColors);
        
        this.parameters.ratingColors = {
            'main': "#9A8B79",
            'sub': "#D7D0C8",
            'grade': "#DDDDDD"
        };
        
        this.parameters.socialMediaColors = {
            'facebook': "#3b5998",
            'twitter': "#55acee"
        };
        
        this.parameters.bubbleGraphPartyColors = {
            'democrat': [ "#C8DEEC", "#77B5E4", "#277EC3" ],
            'republican': [ "#DEC8CA", "#EA7F85", "#EE2128" ],
            'independent': [ "#FDE881", "#FFD401", "#CD9300" ],
            'none': [ "#999999", "#999999", "#999999"]
        }
        
        this.parameters.yearbookAgeColors = {
            '30to39' : "#649B92",
            '40to49' : "#FED331",
            '50to59' : "#9BBFB9",
            'over60' : "#F8EFA9"
        }
        
        if(self.options.data)
        {
            self.data = self.options.data;
            self.groups = self.data.groups;
            self.names = self.data.names;
            self.cells = self.data.cells;
        }
    }
    /***/
    
    /**
     * @function: constructSVG
     * @description: Select and create the graphic inside SVG
     */
    this.constructSVG = function(){
        // Select and empty SVG and outside legend elements (for resize)
        $("#"+self.options.graph+" svg, #"+self.options.graph+" div.legend").html('');
        
        // Create svg (global var)
        $("#"+self.options.graph+" svg").css('height', 'auto');
        self.svg = d3.select("#"+self.options.graph+" svg")
            .attr("class", self.options.type+'Graph')
            .attr("width", self.parameters.areaWidth)
            .attr("height", self.parameters.areaHeight);
        
        // Create the graph and axes container (global var)
        self.main = self.svg.append('g')
            .attr("class", 'main');
        
        // Determine if data has been called (i.e. Is this a fresh call or a resize)
        if (self.data)
            self.drawGraph();
        else {
            self.getData(function(data){
                // Validity check
                if (data == '') {
                    var load = self.div.select(".load");
                    load.select("text")
                        .remove();
                    load.append('text')
                        .attr("dy", '.35em')
                        .text('Error: No data');
                    load.select("path")
                        .attr("d", 'M0,125A125,125 0 1,1 0,-125A125,125 0 1,1 0,125M0,100A100,100 0 1,0 0,-100A100,100 0 1,0 0,100Z');
                } else {
                    // Remove progress bar
                    self.div.select(".load")
                        .transition()
                        .delay(100)
                        .duration(100)
                        .attr("transform", 'translate('+(self.parameters.width/2)+','+(self.parameters.height/2)+')scale(5)')
                        .style("opacity", 0)
                        .remove();
                    
                    // Global var shortcuts for data
                    self.groups = data.groups;
                    self.names = data.names;
                    self.cells = data.cells;
                    
                    // Append data needed for specific displays
                    if (self.options.arrangement == "stacked") {
                        // Add data for bar positioning
                        self.cells.forEach(function(d) {
                            for (i in d){
                                var pos = 0;
                                var neg = 0;
                                for (var i=0; i < d.length; i++){
                                    d[i].startAt = d[i].value > 0 ? pos : neg;
                                    pos += Math.max(0, d[i].value);
                                    neg += Math.min(0, d[i].value);
                                }
                                d.total = [neg, pos];
                            }
                        });
                    } else if (self.options.type == "line") {
                        switch (self.options.scale) {
                            case "linear":
                                // Strip commas and percentages
                                self.percentScale = false;
                                self.cells.forEach(function(d) {
                                    for (i in d){
                                        if (isNaN(d[i].name)) {
                                            if (d[i].name.indexOf("%") > -1)
                                                self.percentScale = true;
                                            d[i].name = parseFloat(d[i].name.replace(/,|%/g,''));
                                        }
                                    }
                                });
                            break;
                            case "time":
                                // Coerce time format
                                self.cells.forEach(function(d) {
                                    for (i in d){
                                        if (!(d[i].name instanceof Date)) {
                                            if (isNaN(d[i].name))
                                                d[i].name = new Date(d[i].name);
                                            else
                                                d[i].name = new Date(d[i].name, 0);
                                        }
                                    }
                                });
                            break;
                        };
                    }
                    
                    // Store data
                    self.data = data;
                    
                    // Graph data
                    self.drawGraph();
                }
            });
        }
        
        // Listen for double click and launch the SVG as an image in preview mode
        if (self.previewMode)
            $("svg").dblclick(self.imageConvert);
    }
    /***/
    
    /**
     * @function: drawGraph
     * @description: Format data, call graph-type and legend-type functions
     */
    this.drawGraph = function(){
        // Define keys for legend
        if (self.options.type == "pie")
            var keys = self.names;
        else if (self.options.type == "bar" || self.options.type == "line") {
            var keys = self.groups;
            // Define shared attributes for bar and line graphs
            
            // Find max value, assume min is 0 until display calls for otherwise (global)
            self.min = 0;
            if (self.options.maxvalue){
                self.max = self.options.maxvalue;
            }
            else if(self.options.ispercent){
                self.max = 100;
            }
            else{
               self.max = d3.max(self.cells, function(a) { return d3.max(a, function(b) { if (!b.value) return 0; return b.value; }); });
            }
            
            // Define scale format function (global)
            switch (self.data.scale) {
                case "percent":
                    self.scaleFormat = self.parameters.percent;
                break;
                case "dollar":
                    //if (self.max > self.parameters.letterBoundary)
                        self.scaleFormat = self.parameters.dollarsL;
                    //else
                    //    self.scaleFormat = self.parameters.dollarsC;
                break;
                default:
                    if (self.max > self.parameters.letterBoundary){
                        self.scaleFormat = self.parameters.letters;
                    }
                    else{
                        self.scaleFormat = self.parameters.integerL;   
                    }
                break;
            }
            
            if(self.options.ispercent){
                self.scaleFormat = self.parameters.percent;   
            }
        }
        
        // Form outside legend first so the graph can account for its width
        if (self.options.legend == "outside")
            self.outsideLegend(keys);
        
        // Draw graph type
        var fn = 'graph'+njHelper.ucFirst(self.options.type);
        if (typeof self[fn] == 'function')
            self[fn]();
        
        // Form other legends after so they can use graph's svg
        switch (self.options.legend) {
            case "top":
                self.topLegend(keys);
                break;
            case "inside":
                self.insideLegend(keys);
                break;
            case "discrete":
                self.discreteLegend();
                break; 
            case "political":
                self.politicalLegend();
                break;
        }
        
        // Standard hover events
        if (self.options.interactive)
            self.interactiveGraph();
        
        if(self.options.hidexaxis)
        {
            self.svg.select('.x.axis').remove();
        }
    }
    /***/
    
    /**
     * @function: interactiveGraph
     * @description: Link key classes with interactive functions 
     */
    this.interactiveGraph = function(){
        // Find the key classes attributed to the keys/data and create a listener for those elements
        var colorKeys = $.map(self.parameters.hex, function(hex){
            return '#'+self.options.graph + ' .key_'+hex;
        });
        colorKeys = colorKeys.join(',');
        
        // Highlight data and its corresponding legend key
        $(colorKeys).on("click touchstart mouseover", function(){
            var thisKey = $(this).attr("class").split(' ')[0];
            self.div.selectAll(".data:not(." + thisKey + "), .key:not(." + thisKey + "), .area:not(." + thisKey + ")").transition().style("opacity", 0.2);
            self.div.selectAll(".area." + thisKey).transition().style("opacity", 0.5);
        });
        $(colorKeys).on("touchstartoutside mouseout", function(){
            self.div.selectAll(".data, .key").transition().style("opacity", 1);
            self.div.selectAll(".area").transition().style("opacity", 0.3);
        });
    }
    /***/
    
    /**
     * @function: ordinalScale
     * @var int: range
     * @var int: padding
     * @description: Format a standard ordinal scale
     */
    this.ordinalScale = function(range, padding){
        return d3.scale.ordinal().rangeRoundBands([0, range], padding, 0).domain(self.names);
    }
    /***/
    
    /**
     * @function: linearScale
     * @var int: start
     * @var int: end
     * @description: Format a standard linear scale
     */
    this.linearScale = function(start, end){
        return d3.scale.linear().range([start, end]).domain([self.min, self.max]).nice();
    }
    /***/
    
    /**
     * @function: form_yAxis
     * @var function: y
     * @var string: placement
     * @description: Build the y-axis for bar and line graphs
     */
    this.form_yAxis = function(scale, placement) {
        
        // Construct yAxis (global)
        self.yAxis = d3.svg.axis()
            .scale(scale)
            .orient(placement)
            .tickSize(0);
        if (self.options.subtype != "horizontal")
            self.yAxis.tickFormat(self.scaleFormat);
        
        // Place y-axis
        var yG = self.main.append('g')
            .attr("class", 'y axis')
            .style("opacity", 0)
            .call(self.yAxis);
            
        if(self.options.tilelabelwords){
            var yNames = self.svg.selectAll(".y.axis .tick text")
                .data(self.cells)
                .each(function(d){
                    var theText = this.textContent;
                    var lengthofText = this.textContent.length;
                    var arrayWords = this.textContent.split(" ");
                    d3.select(this).text('');
                    
                    var overflow = 20;
                    if(njHelper.isPhone() || njHelper.isTablet()){
                        overflow = 11;
                    }
                    
                    if(arrayWords.length > 1 && lengthofText > overflow){
                        var lastPart = arrayWords[arrayWords.length-1];
                        arrayWords[arrayWords.length-1] = "";
                        var firstPart = arrayWords.join(' ');
                        
                        var testDiv = $("<span style='font-size:13px; font-weight:bold;' id='testingDiv'>"+firstPart+"</span>");
                        var testDiv2 = $("<span style='font-size:13px; font-weight:bold;' id='testingDiv2'>"+lastPart+"</span>");
                        $('#raceTracker2014').append(testDiv, testDiv2);
                        var w2 = $('#raceTracker2014 #testingDiv2').width() +3;

                        $('#raceTracker2014 #testingDiv').remove();
                        $('#raceTracker2014 #testingDiv2').remove();
                        
                        finalWidth = w2;
                        
                        if(d[0] && d[0].linkUrl){
                            d3.select(this).append('tspan').attr('dx', 0).attr('dy', 0)
                                .append('svg:a')
                                .attr('xlink:xlink:href', d[0].linkUrl)
                                .text(firstPart);
                                
                            d3.select(this).append('tspan')
                                .attr('dx', -finalWidth)
                                .attr('dy', 15)
                                .append('svg:a')
                                .attr('xlink:xlink:href', d[0].linkUrl)
                                .text(lastPart);
                        } else {
                            d3.select(this).append('tspan').attr('dx', 0).attr('dy', 0)
                                .text(firstPart);
                                
                            d3.select(this).append('tspan')
                                .attr('dx', -finalWidth)
                                .attr('dy', 15)
                                .text(lastPart);
                        }
                    } else {
                        
                        if(d[0] && d[0].linkUrl){
                            d3.select(this)
                                .append('tspan').attr('dx',0).attr('dy',0)
                                .append('svg:a')
                                .attr('xlink:xlink:href', d[0].linkUrl)
                                .text(theText)
                        } else {
                            d3.select(this).append('tspan').attr('dx',0).attr('dy',0)
                                .text(theText);
                        }
                    }
                });
        }
        
        // Determine if last label is partially above/below the graph, adjust vars accordingly
        if (!self.svg.select(".y.axis").node())
            return;
        var yAxisAttr = self.svg.select(".y.axis").node().getBBox();
        var tickHeight = Math.ceil(self.svg.select(".y.axis .tick:first-of-type text").node().getBBox().height) / 2;
        var overflow = Math.ceil(yAxisAttr.height) - tickHeight - self.parameters.areaHeight;
        if (overflow > 0) {
            self.parameters.areaHeight += overflow;
            if (self.hasPositiveValues)
                self.parameters.margin.top += overflow;
        }
        var yTicks = self.svg.selectAll(".y.axis .tick text")
            .attr("x", "-10");
        
        // Find the width of the axis, and adjust
        var yAxisWidth = Math.ceil(yAxisAttr.width);
        self.parameters.width -= yAxisWidth;
        self.parameters.margin[placement] += yAxisWidth;
        
        if (self.options.ylabel) {
            // Provide extra space for the label
            self.parameters.width -= 25;
            self.parameters.margin[placement] += 25;
            
            // Line up the label with the top tick
            var fromTop = overflow <= 0 ? -tickHeight : overflow;
            var fromAxis = placement == 'left' ? -self.parameters.margin[placement] : 25;
            
            // Label y-axis
            yG.append("text")
                .attr("class", 'label')
                .attr("transform", 'rotate(-90)')
                .attr("y", fromAxis)
                .attr("dy", '1em')
                .text(self.options.ylabel);
                
                
            var yLabelAttr = self.svg.select(".y.axis .label").node().getBBox();
            self.svg.select(".y.axis .label").attr("x", 0-(self.parameters.height/2)+(yLabelAttr.width/2));
        }
        
        if (placement == "right")
            yG.attr("transform", 'translate('+self.parameters.width+',0)');
        
        // Ease in
        yG.transition()
            .duration(800)
            .style("opacity", 1);
    }
    /***/
    
    /**
     * @function: form_xAxis
     * @var function: x
     * @var string: placement
     * @var boolean: linear
     * @description: Build the x-axis for bar and line graphs
     */
    this.form_xAxis = function(scale, placement, linear) {
        // Construct xAxis (global)
        self.xAxis = d3.svg.axis()
            .scale(scale)
            .orient(placement)
            .tickSize(0);
        if (linear && njHelper.isPhone())
            self.xAxis.ticks(5);
        if (self.options.subtype == "horizontal")
            self.xAxis.tickFormat(self.scaleFormat);
        else if (self.options.type == "line") {
            if (self.options.scale == "linear" && self.percentScale)
                self.xAxis.tickFormat(self.parameters.percent);
            self.xAxis.tickPadding(10);
        }
        
        // Place x-axis
        var xG = self.main.append('g')
            .attr("class", 'x axis')
            .style("opacity", 0)
            .call(self.xAxis);
        
        // Find the size of the axis, and recalculate the width to account for overflow
        if (linear) {
            self.xRotate = false;
            if (!self.svg.select(".x.axis").node())
                return;
            var overflow = self.svg.select(".x.axis").node().getBBox().x;
            self.parameters.width += overflow;
            if (!self.hasPositiveValues)
                self.parameters.margin.left -= overflow;
            
            self.svg.select(".x.axis").call(self.xAxis.scale(scale.range([0, self.parameters.width])));
        }
        
        // Check if xAjust has set boolean to true
        if (self.xRotate) {
            self.main.selectAll(".x.axis text")
                .attr("class", 'rotate')
                .attr("transform", 'rotate(-45)');
        }
        
        // Append axis label
        if (self.options.xlabel) {
            xG.append('text')
                .attr("class", 'label')
                .attr("x", self.parameters.width/2)
                .attr("y", function(){ 
                        if(self.xRotate){
                            var xbox = self.svg.select(".x.axis").node().getBBox();
                            return xbox.height + 15;
                        }
                        if(self.options.setxlabelypos){
                            return self.options.setxlabelypos;   
                        }
                        return 35;
                    })
                .text(self.options.xlabel);
        }
        
        // Re-calculate the graph height from the axis and position the axis
        var xAxisHeight = Math.ceil(self.svg.select(".x.axis").node().getBBox().height);
        self.parameters.areaHeight += xAxisHeight;
        self.svg.attr("height", self.parameters.areaHeight);
        if (placement == "top")
            self.parameters.margin.top += xAxisHeight;
        else
            xG.attr("transform", 'translate(0,'+self.parameters.height+')');
        
        // Ease in
        xG.transition()
            .duration(800)
            .style("opacity", 1);
    }
    /***/
    
    /**
     * @function: xAjust
     * @description: Measure the x-axis ticks to determine if graph 
     * width needs to be adjusted to accommodate overflow from the last 
     * tick, or if the ticks are too long and need to be rotated.
     */
    this.xAjust = function(){
        // Default (global)
        self.xRotate = false;
        
        // Add label temporarily to measure its width, then delete it
        var count = self.names.length;
        var longest = self.names.reduce(function (a, b){ return a.toString().length > b.toString().length ? a : b; });
        var longestWidth = self.svg.append("text").attr("class", 'x axis').text(longest).node().getComputedTextLength();
        var lastWidth = self.svg.append("text").attr("class", 'x axis').text(self.names[count-1]).node().getComputedTextLength();
        self.svg.selectAll(".x.axis").remove();
        var maxWidth = Math.round(self.parameters.width / count) - 2;
        
        // Default
        var overflow = 0;
        
        // Determine if adjustment is needed
        if (longestWidth > maxWidth) {
            overflow = 10;
            self.xRotate = true;
        } else if (self.options.subtype != "vertical")
            overflow = Math.ceil(lastWidth / 2);
        
        if (overflow > self.parameters.margin.right)
            self.parameters.width -= overflow;
    }
    /***/
    
    /**
     * @function: defineNegative
     * @var string: select
     * @var function: axis
     * @description: Define clipping path and shading for negative values
     */
    this.defineNegative = function(select, axis) {
        // Check the ticks for the index of 0.
        var scale = axis.scale().ticks(axis.ticks()[0]);
        var i = scale.indexOf(0) + 1;
        
        // Draw the zero line across the graph
        self.svg.select("."+select+".axis .tick:nth-of-type("+i+") line").attr("class", 'zero');
        
        // Add definitions
        def = self.svg.insert('defs', "g:first-of-type");
    }
    /***/
    
    /**
     * @function: pointIsInArc
     * @var obj: pt
     * @var obj: ptData
     * @var funct: d3Arc
     * @description: http://stackoverflow.com/a/19801529
     */
    this.pointIsInArc = function(pt, ptData, d3Arc) {
        var r1 = d3Arc.innerRadius()(ptData),
            r2 = d3Arc.outerRadius()(ptData),
            theta1 = d3Arc.startAngle()(ptData),
            theta2 = d3Arc.endAngle()(ptData);
        
        var dist = pt.x * pt.x + pt.y * pt.y,
            angle = Math.atan2(pt.x, -pt.y);
        
        angle = (angle < 0) ? (angle + Math.PI * 2) : angle;
        
        return (r1 * r1 <= dist) && (dist <= r2 * r2) && (theta1 <= angle) && (angle <= theta2);
    }
    /***/
    
    /**
     * @function: colorPicker
     * @description: Select cell color
     */
    this.colorPicker = function(d,i){
        if (self.options.colorscheme == 'political'){
            if (d.party && (d.party.toLowerCase() == 'republican' || d.party.toLowerCase() == 'democrat' || d.party.toLowerCase() == 'none')){
                if(self.parameters.politicalPartyColorsVar[d.party.toLowerCase()][d.index])
                    return self.parameters.politicalPartyColorsVar[d.party.toLowerCase()][d.index];
            }
            if (self.parameters.politicalPartyColorsVar['other'][d.index])
               return self.parameters.politicalPartyColorsVar['other'][d.index];
            return self.parameters.politicalPartyColorsVar['other'][0]
        }
        
        if (self.options.colorscheme == 'politicalHeatMap'){
            if (d.party && (d.party.toLowerCase() == 'republican' || d.party.toLowerCase() == 'democrat')){
                if(self.parameters.politicalPartyHeatMapColors[d.party.toLowerCase()][d.index])
                    return self.parameters.politicalPartyHeatMapColors[d.party.toLowerCase()][d.index];
            }
            if (self.parameters.politicalPartyHeatMapColors['other'][d.index])
               return self.parameters.politicalPartyHeatMapColors['other'][d.index];
            
            return self.parameters.khakiColor['default'];
        }
        if(self.options.colorscheme == 'racetracker'){
            return '#'+self.parameters.raceTrackerColors(d.group);
        }
        if (self.options.colorscheme == "racebar"){
            return '#'+self.parameters.raceBarColors(i);
        }
        if (self.options.colorscheme =='ratings'){
            return self.parameters.ratingColors[d.category.toLowerCase()];
        }
        if (self.options.colorscheme == 'khaki'){
            return self.parameters.khakiColor['default'];
        }
        if (self.options.colorscheme == 'sponsoredapi'){
            if (self.parameters.sponsoredApi[d.value])
                return self.parameters.sponsoredApi[d.value];
            return self.parameters.sponsoredApi['default'];
        }
        if (self.options.colorscheme == 'racepie'){
            return '#'+self.parameters.racePieColors(d.group);
        }
        if (self.options.colorscheme == 'raceline'){
            return '#'+self.parameters.raceLineColors(d.group);
        }
        if (self.options.colorscheme == 'sector'){
            return '#'+self.parameters.sGraphColors(d.group);
        }
        if(self.options.colorscheme == 'socialmedia'){
            return self.parameters.socialMediaColors[d.social];
        }
        return '#'+self.parameters.colors(d.group);
    }
    /***/
    
    
    /**
     * @function: graphBar
     * @description: Render graph with vertical or horizontal, grouped or stacked bars
     */
    this.graphBar = function(){
        if (self.options.arrangement == "stacked") {
            // Check min (if < 0) and update max to the TOTAL value for each group
            self.min = Math.min(0, d3.min(self.cells, function (d) { return d.total[0]; }));
            self.max = d3.max(self.cells, function (d) { return d.total[1]; });
        } else {
            // Detect min if < 0. Use 0 if max is negative
            self.min = Math.min(0, d3.min(self.cells, function(a) { return d3.min(a, function(b) { if (!b.value) return 0; return b.value; }); }));
            self.max = Math.max(0, self.max);
        }
        
        // Set global booleans
        self.hasPositiveValues = self.max >= 0 ? true : false;
        self.hasNegativeValues = self.min < 0 ? true : false;
        
        // Format scales & axes
        if (self.options.subtype == "horizontal") {
            var x = self.ordinalScale(self.parameters.height, .2);
            if(!self.options.labelspacing)
            {
                x = self.ordinalScale(self.parameters.height, 0);
            }
            if(!self.options.hideyaxis)
            {
                self.form_yAxis(x, self.hasPositiveValues ? 'left' : 'right');
            }
            var y = self.linearScale(0, self.parameters.width);
            self.form_xAxis(y, 'bottom', true);
            var linearStr = 'x';
            var linearFun = self.xAxis;
            var barPosition = function(d) { return 'translate(0, ' + x(d[0].name) + ')'; }
            
            self.svg.selectAll(".x.axis line").attr("y2", -self.parameters.height);
            
        } else {
            var y = self.linearScale(self.parameters.height, 0);
            if(!self.options.hideyaxis)
            {
                self.form_yAxis(y, 'left');
            }
            self.xAjust();
            var x = self.ordinalScale(self.parameters.width, .2);
            self.form_xAxis(x, self.hasPositiveValues ? 'bottom' : 'top', false);
            
            var linearStr = 'y';
            var linearFun = self.yAxis;
            var barPosition = function(d) { return 'translate(' + x(d[0].name) + ',0)'; }
            
            self.svg.selectAll(".y.axis line").attr("x2", self.parameters.width);
        }

        if(self.options.paddingbargroups){
            var xN = d3.scale.ordinal()
                .rangeRoundBands([0, x.rangeBand()], 0, self.options.paddingbargroups)
                .domain(self.groups);
        } else{
            var xN = d3.scale.ordinal()
                .rangeRoundBands([0, x.rangeBand()])
                .domain(self.groups);
        }     
      

        // Load patterns for negative bars
        if (self.hasNegativeValues) {
            self.defineNegative(linearStr, linearFun);
            for (var i = 0; i < self.groups.length; i++) {
                def.append('pattern')
                    .attr("id", 'light'+i)
                    .attr("width", 5)
                    .attr("height", 5)
                    .attr("patternUnits", 'userSpaceOnUse')
                    .attr("patternTransform", 'rotate(-45)')
                    .append('path')
                        .attr("d", 'M -1,2 l 6,0')
                        .attr("stroke", '#'+self.parameters.hex[i])
                        .attr("stroke-width", 2);
            }
        }
        
        // Position the graph
        self.main.attr("transform", 'translate('+self.parameters.margin.left+','+self.parameters.margin.top+')');
        
        // Render the bar data
        var graph = self.main.append('g')
            .attr("class", 'graph')
        .selectAll(".graph")
            .data(self.cells)
            .enter()
            .append('g')
                .attr("class", function(d) { return 'dataGroup group_' + d[0].name.toString().replace(/[^a-z0-9]/gi, ''); })
                .attr("transform", barPosition)
            .selectAll(".dataGroup")
            .data(function(d) { return d; })
            .enter()
            .append('rect')
                .attr("class", function(d) {return 'key_'+self.parameters.colors(d.group) + ' group_'+d.name.toString().replace(/[^a-z0-9]/gi, '') + ' data'; })
                .style("fill", function(d,i) {
                    if(self.options.colorscheme == 'ageyearbook'){
                        return self.parameters.yearbookAgeColors[d.group];
                    } 
                    return d.value < 0 ? 'url(#light'+i+')' : self.colorPicker(d,i); 
             });
        
        if (self.options.subtype == "horizontal") {
            if (self.options.arrangement == "stacked") {
               // Horizontal stacked
               graph.attr("width", 1)
                    .attr("height", x.rangeBand() - (x.rangeBand() * .20))
                    .attr("x", y(0))
                    .transition()
                        .duration(1000)
                        .attr("width", function(d) { return Math.abs(y(0) - y(d.value)); })
                        .attr("x", function(d) { return d.value < 0 ? y(d.startAt) + y(d.value) - y(0) : y(d.startAt); });
            } else {
                // Horizontal grouped
                graph.attr("width", 1).attr("y", function(d, i) {
                    var y = xN(d.group);
                    if(self.options.adjustbarspacing_y){
                        y += self.options.adjustbarspacing_y * i;
                    }
                    return y; 
                });

                if(self.options.adjustbarspacing){
                    graph.attr("x", self.options.adjustbarspacing);
                } else{
                    graph.attr("x", function(d) { return d.value < 0 ? y(d.value) : y(0); });
                }
                
                if(self.options.barheight){
                    graph.attr("height", self.options.barheight);
                } else{
                    graph.attr("height", xN.rangeBand());
                    self.options.barheight = xN.rangeBand();
                }
                
                graph.transition()
                        .duration(1000)
                        .attr("width", function(d) { 
                            if (!d.value) 
                                return 0; 
                                
                            if(d.category && d.category=='grade'){
                                return '100%';
                            }
                            return Math.abs(y(0) - y(d.value)); 
                         })
            }
        } else {
            if (self.options.arrangement == "stacked") {
                // Vertical stacked
                graph.attr("width", x.rangeBand())
                    .attr("height", 0)
                    .attr("y", y(0))
                    .transition()
                        .duration(1000)
                        .attr("height", function(d) { return  Math.abs(y(0) - y(d.value)); })
                        .attr("y", function(d) { return d.value < 0 ? y(d.startAt) : y(d.startAt) + y(d.value) - y(0); });
            } else {
                // Vertical grouped (default)
                graph.attr("width", xN.rangeBand())
                    .attr("height", 1)
                    .attr("x", function(d) { return xN(d.group); })
                    .attr("y", y(0))
                    .transition()
                        .duration(1000)
                        .attr("height", function(d) { return Math.abs(y(0) - y(d.value)); })
                        .attr("y", function(d) { return y(Math.max(0, d.value)); });
            }
        }
        
        if(self.options.embedyvalues)
        {
            var dataGroup = self.main.data(self.cells).selectAll(".dataGroup").selectAll('rect');
            self.main
                .data(self.cells)
                .selectAll(".dataGroup rect").each(function(d, i){
                    var rect = this;
                    d3.select(this.parentNode).append('text')
                        .each(function(){
                            var textBox = this;
                            var label = '';
                            if (!d.value && self.options.subtype=="vertical")
                                return '';
                            if(d.category && d.category == 'grade'){
                                if(d.value < 60){
                                    label = 'F';
                                } else if (d.value < 70){
                                    label = 'D';
                                } else if (d.value < 80){
                                    label = 'C';
                                } else if (d.value < 90){
                                    label = 'B';
                                } else if (d.value <= 100){
                                    label = 'A';
                                }
                            }else{
                                if(d.group.toLowerCase().indexOf("hide") > -1){
                                    label = '';
                                } else{
                                    label = self.scaleFormat(d.value);   
                                }
                            }
                            var theClass ='';
                            if (d.extra){
                                if(d.extra.classname){
                                    theClass = d.extra.classname;
                                }
                                d3.select(this).append('tspan').text(label).attr('width', 'auto').attr('dx', 0).attr('dy', 0);
                                if(d.extra.label){
                                    d3.select(this).append('tspan').text(d.extra.label).attr('width', 'auto').attr('class', 'extra ' + theClass)
                                        .attr('x', function(){
                                            if (!d.value){
                                                if(self.options.adjustbarspacing)
                                                    return self.options.adjustbarspacing;
                                                return 0;
                                            }
                                            var extra = self.options.adjustbarspacing ? self.options.adjustbarspacing : 0;
                                            return Math.abs(y(0) - y(d.value) - extra - 5);
                                        })
                                        .attr('dy', function(){
                                            //var labelBox = d3.select(textBox).select('tspan').node().getBBox();
                                            var labelBox = d3.select(textBox).node().getBBox();
                                            return labelBox.height - 5;
                                        });
                                }
                            } else {
                                d3.select(this).text(label);
                            }
                        })
                        .attr("class", function(){ return 'barValue label_'+d.name.toString().replace(/[^a-z0-9]/gi, ''); })
                        .attr("x", function(){
                            if (!d.value){
                                if(self.options.adjustbarspacing)
                                    return self.options.adjustbarspacing;
                                return 0;
                            }
                            var extra = self.options.adjustbarspacing ? self.options.adjustbarspacing : 0;
                            
                            if(d.category){
                                if(d.category=='grade'){
                                    return '50%';      
                                }
                            }
                            
                            if(self.options.subtype == "vertical"){
                                var bar = d3.select(rect).node().getBBox();
                                var node = d3.select(this).node().getBBox();
                                return bar.x + (bar.width - node.width) / 2;
                            }
                            
                            if(self.options.arrangement == "stacked" && self.options.subtype == 'horizontal'){
                                return Math.abs(y(0) - y(d.startAt) - extra - 2);
                            }
                            return Math.abs(y(0) - y(d.value) - extra - 5);
                         })
                        .attr("y", function(d){
                            if(self.options.subtype=="horizontal"){
                                var bar = d3.select(rect).node().getBBox();
                                var node = d3.select(this).node().getBBox();
                                //cant explain this but it works
                                var offset = node.height / 3 + 5;
                                var yPos = 0;
                                var h = 0;
                                if (bar && d[0].value != 'null'){
                                    yPos = bar.y;
                                    h = bar.height;
                                }
                                else{
                                    if (self.options.barheight){
                                        yPos =  self.options.barheight * i;
                                        h = self.options.barheight
                                    }
                                }
                                return newY = yPos + offset + ((h - node.height) / 2);
                            } else{
                                var ypos = 0;
                                if (d.value)
                                    ypos = d.value;
                                else
                                    ypos = d[ i % d.length ].value
                                    
                                if(self.options.arrangement == "stacked" && self.options.subtype == 'vertical'){
                                    return y(d[i % d.length].startAt)-5;
                                }
                                return y(ypos) - 5;
                            }
                        })
                });
                /*if(self.options.subtype == "vertical"){
                    self.main.selectAll(".dataGroup text").each(function(){
                        
                        d3.select(this)
                            .attr("opacity", 0);
                        
                        var textNode = d3.select(this).node().getBBox(); 
                        d3.select(this)
                            //.attr("transform", 'translate('+ textNode.x+','+ -textNode.y+')rotate(-90)');
                            .attr("transform", 'rotate(-90 '+ textNode.x+','+ textNode.y+')');
                    })
                }*/
        }
        
        // Display bar values on hover
        if (self.options.interactive) {
            
            var dataGroup = self.main.data(self.cells).selectAll(".dataGroup").selectAll('rect');
            self.main
                .data(self.cells)
                .selectAll(".dataGroup rect").each(function(d, i){
                    if (d.hover){
                        var rect = d3.select(this);
                        rect.attr('class', rect.attr('class')+' hoverAction');
                        rect.attr('data-hover', d.hover);
                    }
                });
            
            $("#"+self.options.id+" .barGraph .data").on("click touchstart", function(){
                var thisBar = $(this).attr("class");
                var attr = d3.select(this).node().getBBox();
                if (self.options.subtype == "horizontal") {
                    var xAttr = attr.x + attr.width + 5;
                    var yAttr = attr.y + attr.height/2 + 5;
                    var styleAttr = {"opacity": 0};
                } else {
                    var xAttr = attr.x + attr.width/2;
                    var yAttr = attr.y - 5;
                    var styleAttr = {"text-anchor": 'middle', "opacity": 0};
                }
                if (!d3.select(this.parentNode).select('text').length){
                    d3.select(this.parentNode).append('text')
                        .attr("class", 'barValue ' + thisBar)
                        .attr("x", xAttr)
                        .attr("y", yAttr)
                        .style(styleAttr)
                        .text(self.scaleFormat($(this).context.__data__.value))
                        .transition()
                            .style("opacity", 1);
                }
                
            });
            
            $(".data").on("touchstartoutside mouseout", function(){
                var thisBar = $(this).attr("class").replace(/ /g, '.');
                $(".barValue."+thisBar).fadeOut(250, function() {
                    $(".barValue."+thisBar).remove()
                });
            });
            
            // Display total value on hover of x-label
            if (self.options.arrangement == "stacked") {
                var groupAxis = (self.options.subtype == "horizontal") ? '.y.axis' : '.x.axis';
                $(groupAxis + " .tick text").on("click touchstart mouseover", function(){
                    var thisGroup = '.group_' + $(this).text().replace(/[^a-z0-9]/gi, '');
                    $(".data:not("+thisGroup+")").fadeTo(250, 0.5);
                    $(groupAxis + " .tick text").fadeTo(250, 0.5);
                    $(this).stop().css("opacity", 1);
                    var found = false;
                    for (var i = $("rect"+thisGroup).length; i >= 0 && !found; i--) {
                        var groupAttr = d3.select("rect"+thisGroup+":nth-of-type("+i+")").node().getBBox();
                        if (groupAttr.width)
                            found = true;
                    }
                    if (self.options.subtype == "horizontal") {
                        var xGroupAttr = groupAttr.x + groupAttr.width + 5;
                        var yGroupAttr = groupAttr.height/2 + 5;
                        var styleGroupAttr = {"opacity": 0};
                    } else {
                        var xGroupAttr = groupAttr.width/2;
                        var yGroupAttr = groupAttr.y - 5;
                        var styleGroupAttr = {"text-anchor": 'middle', "opacity": 0};
                    }
                    //
                    //TODO!!! PLACE AND DISPLAY TOTALS INDIVIDUALLY FOR NEGATIVE STACKS
                    var groupTotal = 0;
                    if (self.hasPositiveValues)
                        groupTotal += $("g"+thisGroup)[0].__data__.total[1];
                    if (self.hasNegativeValues)
                        groupTotal -= $("g"+thisGroup)[0].__data__.total[0];
                    self.main.select("g"+thisGroup).append('text')
                        .attr("class", 'groupValue')
                        .attr("x", xGroupAttr)
                        .attr("y", yGroupAttr)
                        .style(styleGroupAttr)
                        .text(self.scaleFormat(groupTotal))
                        .transition()
                            .style("opacity", 1);
                });
                $(groupAxis + " .tick text").on("touchstartoutside mouseout", function(){
                    $(".groupValue").fadeOut(250, function() {
                        $(".groupValue").remove()
                    });
                    $(".data").fadeTo(250, 1);
                    $(groupAxis + " .tick text").fadeTo(250, 1);
                });
            }
        }   
    }
    /***/
    
    /**
     * @function: graphLine
     * @description: Render line graph or scatter plot
     */
    this.graphLine = function(){
        // Determine if the graph has positive space (global)
        self.hasPositiveValues = self.max > 0 ? true : false;
        
        // If this is a negative graph that is not auto-scaled, set max to 0
        if (!self.options.min && self.max < 0)
            self.max = 0;
        
        // Check if the min value needs to be calculated (auto-scale or negative graph)
        if (self.options.min || self.max <= 0)
            self.min = d3.min(self.cells, function(a) { return d3.min(a, function(b) { return b.value; }); });
        
        // Define y-scale
        var y = self.linearScale(self.parameters.height, 0);
        self.form_yAxis(y, 'left');
        
        // Define x-scale
        var place = self.hasPositiveValues ? 'bottom' : 'top';
        switch (self.options.scale) {
            case "linear":
                // Make room for percentage sign
                if (self.percentScale)
                    self.parameters.width -= 5;
                
                // Define x-scale
                var x = d3.scale.linear()
                    .range([0, self.parameters.width])
                    .domain([self.cells[0][0].name, self.cells[0][self.names.length-1].name])
                    .nice();
                self.form_xAxis(x, place, true);
                break;
            case "time":
                // Define x-scale
                var x = d3.time.scale()
                    .range([0, self.parameters.width])
                    .domain([self.cells[0][0].name, self.cells[0][self.names.length-1].name])
                    .nice();
                self.form_xAxis(x, place, true);
                
                // Highlight years in mixed date labels
                self.svg.selectAll(".x.axis .tick text").forEach(function(d) {
                    var children = false;
                    for (i in d){
                        if (i != 'parentNode') {
                            if (isNaN(d[i].innerHTML)) {
                                var nth = parseInt(i) + 1;
                                self.svg.select(".x.axis .tick:nth-of-type("+nth+") text").attr("class", 'child');
                                children = true;
                            }
                        }
                    }
                    for (i in d){
                        if (i != 'parentNode') {
                            if (!isNaN(d[i].innerHTML) && children) {
                                var nth = parseInt(i) + 1;
                                self.svg.select(".x.axis .tick:nth-of-type("+nth+") text").attr("class", 'parent');
                            }
                        }
                    }
                });
                break;
            default:
                // Define x-scale
                self.xAjust();
                var x = self.ordinalScale(self.parameters.width, 1);
                self.form_xAxis(x, place, false);
                break;
        }
        
        if(self.options.showyticksonly){
            // Draw tick lines across the y-axis
            var yLines = self.parameters.width;
            self.svg.selectAll(".y.axis line").attr("x2", yLines);
        } else{
            // Draw tick lines across the x-axis
            var xLines = self.parameters.height;
            if (place == 'bottom')
                xLines *= -1;
            self.svg.selectAll(".x.axis line").attr("y2", xLines);
        }
        
        // Position the graph
        self.main.attr("transform", 'translate('+self.parameters.margin.left+','+self.parameters.margin.top+')');
        
        // Define line and area functions
        var line = d3.svg.line()
            .defined(function(d) { return !isNaN(parseInt(d.value)); })
            .interpolate(self.options.arrangement)
            .x(function(d) { return x(d.name); })
            .y(function(d) { return y(d.value); });
        var area = d3.svg.area()
            .defined(line.defined())
            .interpolate(line.interpolate())
            .x(line.x())
            .y0(self.min > 0 ? self.parameters.height : y(0))
            .y1(line.y());
        
        // Determine if the graph has negative space (global)
        self.hasNegativeValues = false;
        if (self.min < 0) {
            self.hasNegativeValues = true;
            self.defineNegative('y', self.yAxis);
            var zeroLine = y(0);
            if (zeroLine > 0) {
                self.svg.select("line.zero").attr("x2", self.parameters.width);
                def.append('clipPath')
                    .attr("id", 'positive')
                    .append('rect')
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("width", self.parameters.width)
                        .attr("height", zeroLine);
                def.append('clipPath')
                    .attr("id", 'negative')
                    .append('rect')
                        .attr("x", 0)
                        .attr("y", zeroLine)
                        .attr("width", self.parameters.width)
                        .attr("height", self.parameters.height - zeroLine);
            }
            for (var i = 0; i < self.groups.length; i++) {
                def.append('pattern')
                    .attr("id", 'shade'+i)
                    .attr("width", 1)
                    .attr("height", 1)
                    .attr("patternUnits", 'userSpaceOnUse')
                    .append('circle')
                        .attr("r", 1)
                        .attr("fill", '#'+self.parameters.hex[i]);
            }
        }
        
        // Render the line/scatter data
        var graph = self.main.append('g')
            .attr("class", 'graph')
        .selectAll(".graph")
            .data(self.cells)
            .enter()
            .append('g')
                .attr("class", 'dataGroup')
                .attr("clip-path", 'url(#visible)');
        
        // Draw area path first (on bottom)
        if (self.options.subtype == "area") {
            // Helper function
            var drawArea = function(sign){
                graph.append("path")
                    .attr("class", function(d) { return 'key_'+self.parameters.colors(d[0].group) + ' area'; })
                    .attr("d", area)
                    .attr("clip-path", 'url(#'+sign+')')
                    .attr("fill", function(d,i) { return sign == 'negative' ? 'url(#shade'+i+')' : '#'+self.parameters.colors(d[0].group); })
                    .style("opacity", 0.3);
            }
            
            // Form the area
            if (self.hasPositiveValues)
                drawArea('positive');
            if (self.hasNegativeValues)
                drawArea('negative');
        }
        
        // If subtype is area and/or line
        if (self.options.subtype != "scatter") {
            // Create clipping path to be animated for line and area load effect
            if (typeof def === 'undefined')
                def = self.svg.insert('defs', "g:first-of-type");
            var animate = def.append('clipPath')
                    .attr("id", 'visible');
            var animateSize = animate.append('rect')
                    .attr("width", 0)
                    .attr("height", self.parameters.height);
            
            // Helper function
            var drawLine = function(sign){
                graph.append("path")
                    .attr("class", function(d) { return 'key_'+self.parameters.colors(d[0].group) + ' data'; })
                    .attr("d", line)
                    .attr("clip-path", 'url(#'+sign+')')
                    .attr("stroke-dasharray", sign == 'negative' ? 1 : 'none')
                    .style("stroke", function(d) { 
                        if(self.options.colorscheme=='racetracker'){
                            return '#'+self.parameters.raceTrackerColors(d[0].group);
                        }
                        if(self.options.colorscheme=='raceline'){
                            return '#'+self.parameters.raceLineColors(d[0].group);
                        }
                        if(self.options.colorscheme=='sector'){
                            return '#'+self.parameters.sGraphColors(d[0].group);
                        }
                        if(self.options.colorscheme=='socialmedia'){
                            return self.parameters.socialMediaColors[d[0].social];
                        }
                        return '#'+self.parameters.colors(d[0].group); });
            }
            
            // Form the line(s)
            if (self.hasPositiveValues)
                drawLine('positive');
            if (self.hasNegativeValues)
                drawLine('negative');
            
            // Animate load
            animateSize.transition()
                .delay(200)
                .duration(800)
                .attr("width", self.parameters.width)
            animate.transition()
                .delay(1000)
                .remove();
        }
        
        // Draw points points on top
        if (self.options.size > 0) {
            graph.selectAll(".dataGroup")
                .data(function(d) { return d.filter(function(d) { return d.value != undefined; }); })
                .enter()
                .append("circle")
                    .attr("class", function(d) { return 'key_'+self.parameters.colors(d.group) + ' key'; })
                    .attr("cx", line.x())
                    .attr("cy", line.y())
                    .attr("r", 0)
                    .attr("fill", function(d) { 
                        if(self.options.colorscheme=='racetracker'){
                            return '#'+self.parameters.raceTrackerColors(d.group);
                        }
                        if(self.options.colorscheme=='raceline'){
                            return '#'+self.parameters.raceLineColors(d.group);
                        }
                        if(self.options.colorscheme=='socialmedia'){
                            return self.parameters.socialMediaColors[d.social];
                        }
                        return '#'+self.parameters.colors(d.group); })
                    .each(function(d){
                        if (d.hover){
                            var circle = d3.select(this);
                            circle.attr('class', circle.attr('class')+' hoverAction');
                            circle.attr('data-hover', d.hover);
                        }
                    })
                    .transition()
                        .delay(self.options.subtype != "scatter" ? 1000 : 400)
                        .duration(2000)
                        .ease("elastic")
                        .attr("r", self.options.size);
        }
    }
    /***/
    
    /**
     * @function: graphPie
     * @description: Render pie graph
     */
    this.graphPie = function(){
        // Center graph for pie
        self.main.attr("transform", 'translate('+ self.parameters.width/2 + ',' + (self.parameters.height/2 + self.parameters.margin.top) + ')');
        
        // Calculate radius from shorter side of the graph
        var radius = Math.min(self.parameters.width, self.parameters.height) / 2;
        
        // Internal radius
        var donut = 0;
        if (self.options.subtype == "donut")
            donut = radius*(2/3);
        
        // Define arc and pie functions
        var arc = d3.svg.arc()
            .outerRadius(radius)
            .innerRadius(donut);
        var pie = d3.layout.pie()
            .value(function(d) { return d.value; });
        if (self.options.arrangement == "unsorted")
            pie.sort(null);
        
        // Render the data
        var g = self.main.selectAll(".arc")
            .data(pie(self.cells[0]))
            .enter();
        var dataGroup = g.append('g')
            .attr("class", 'dataGroup')
            .style("opacity", 0);
            
            
        
        dataGroup.append('path')
            .attr("class", function(d) { return 'key_'+self.parameters.colors(d.data.name) + ' data'; })
            .attr("d", arc)
            //.attr("data-hover_text", 'show me on hover')
            .style("fill", function(d,i) {
               if(self.options.colorscheme=='racepie'){
                    return '#'+self.parameters.racePieColors(d.data.name);
               } 
               var color = self.colorPicker(d.data, i);
               if (color)
                  return color;
               return '#'+self.parameters.colors(d.datapie.name); 
            });

        if(self.options.interactive){
            dataGroup.selectAll('path')
                .each(function(d){
                    var path = d3.select(this);
                    if (d.data.hover){
                        path.attr('class', path.attr('class')+' hoverAction');
                        path.attr('data-hover', d.data.hover);
                    }
                });
        }
                
        dataGroup.append('text')
            .attr("transform", function(d) { return 'translate(' + arc.centroid(d) + ')'; })
            .attr("dy", '.5em')
            .text(function(d) { return ((d.endAngle - d.startAngle) * 15.9154943092).toFixed(1) + '%'; })
            .each(function (d) {
                var bb = this.getBBox(),
                    center = arc.centroid(d);
                var topLeft = {
                    x: center[0] + bb.x,
                    y: center[1] + bb.y
                };
                var topRight = {
                    x: topLeft.x + bb.width,
                    y: topLeft.y
                };
                var bottomLeft = {
                    x: topLeft.x,
                    y: topLeft.y + bb.height
                };
                var bottomRight = {
                    x: topLeft.x + bb.width,
                    y: topLeft.y + bb.height
                };
                d.visible = self.pointIsInArc(topLeft, d, arc) && self.pointIsInArc(topRight, d, arc) && self.pointIsInArc(bottomLeft, d, arc) && self.pointIsInArc(bottomRight, d, arc);
             })
            .attr("class", function (d) { return 'key_'+self.parameters.colors(d.data.name) + ' data hide'; })
            .style("text-anchor", 'middle');
        
        // Animate load
        dataGroup.transition()
            .delay(function (d,i){ return i*50;})
            .duration(500)
            .style("opacity", 1);
        
        // Create a label in the center of the pie if column header is not blank
        if(!self.options.nolabel){
            if (self.groups[0].indexOf("_") == -1) {
                self.main.append("text")
                    .attr("class", 'label')
                    .text(self.groups[0])
                    .style("opacity", 0)
                    .transition()
                        .delay(100)
                        .duration(500)
                        .style("opacity", 1);
            }    
        }
        // Show hidden text on small pie pieces on hover
        if (self.options.interactive) {
            
            $(document).on("click touchstart mouseover", '#'+self.options.id+" .hoverAction", function(e){
                if ($('#njGraphichoverActionDisplay').length){
                    $('#njGraphichoverActionDisplay').remove();
                    $('#njGraphichoverActionDisplay').unbind('clickoutside touchstartoutside');
                }

                var html = '';
                html+= '<div id="njGraphichoverActionDisplay">'
                html+=      $(this).data().hover;
                html+= '</div>'
                $('#'+self.options.id).append(html);
                var offset = $(this).position();
                $('#njGraphichoverActionDisplay').css({
                    top: offset.top,
                    left: offset.left
                });
                
                $('#njGraphichoverActionDisplay').bind('clickoutside touchstartoutside mouseout', function(){
                    $('#njGraphichoverActionDisplay').unbind('clickoutside touchstartoutside mouseout');
                    $('#njGraphichoverActionDisplay').remove();
                });
            });
            /*$(".data, .key").on("click touchstart mouseover", function(){
                var thisClass = $(this).attr("class").split(' ')[0];
                var thisKey = 'text.'+thisClass+'.data';
                
                if (self.svg.select(thisKey).classed("hide")) {
                    $(thisKey).show().css({"pointer-events":'none', "opacity":0});
                    self.svg.select(thisKey).transition().style("opacity", 1);
                    $('.'+thisClass).on("touchstartoutside mouseout", function(){
                        $(thisKey).css("display", '');
                    });
                }
            });*/
        }
    }
    /***/
    
    /**
     * @function: graphMap
     * @description: Render map graph
     */
    this.graphMap = function(){
        // D3 functions to place and scale the map
        var projection = d3.geo.albersUsa()
            .scale(self.parameters.width * 1.3)
            .translate([self.parameters.width/2, self.parameters.height/2]);
        var path = d3.geo.path()
            .projection(projection);
        
        // Load map data from topojson
        d3.json("/js/libs/d3/us.json").get(function(error, us) {
            self.main.selectAll("path")
                .data(topojson.feature(us, us.objects.states).features)
                .enter()
                .append("path")
                    .attr("class", function(d) {
                        if (d.state){
                            var state = (d.state).toLowerCase().replace(/[^a-z0-9]/gi, '');
                            if (self.options.active == state)
                                return 'state active ' + state;
                            if (self.data[d.state] && self.options.colorscheme == 'sponsoredapi')
                                return 'state ' + state + ' selectedapi'; 
                            return 'state ' + state;
                        }
                    })
                    .attr("data-state", function(d) {
                        if (d.state)
                            return d.state;
                    })
                    .attr("data-text", function(d) {
                        if (self.data[d.state])
                            return self.data[d.state].text;
                    })
                    .attr("d", path)
                    .transition().style("fill", function(d) {
                        if(self.options.colorscheme)
                        {
                            var color = self.colorPicker(d);
                            if (self.data[d.state])
                                return self.colorPicker(self.data[d.state]);
                            return color;
                        }
                        if (self.data[d.state]) {
                            var value = self.data[d.state].percent.replace(/,|%/g,'');
                            var sign = '';
                            if (self.data[d.state].party != '3rd') {
                                if (value >= 60)
                                    sign = '++';
                                else if (value >= 55)
                                    sign = '+';
                                else if (value < 40)
                                    sign = '--';
                                else if (value < 50)
                                    sign = '-';
                            }
                            return self.parameters.partyColors(self.data[d.state].party + sign);
                        }
                    }).each('end', function(){
                        // Check for text to display on mouseover
                        if (self.options.interactive) {
                            $("#"+self.options.graph+" .state").on("touchstart mouseover", function(e){
                                //$(".tooltip").remove();
                                if ($(this).data().text){
                                    var thisClass = $(this).attr("class").split(' ')[1];
                                    
                                    self.main.selectAll(".state:not(."+thisClass+")")
                                        //.transition()
                                            //.duration(100)
                                            .style("opacity", '0.75');
                                    
                                    $("."+thisClass).on("touchstartoutside mouseout", function(){
                                        self.main.selectAll(".state:not(."+thisClass+")")
                                            //.transition()
                                                //.duration(100)
                                                .style("opacity", '1');
                                    });
                                    
                                    /*$("body").append(
                                        '<div class="tooltip" style="left:'+e.pageX+'px;top:'+e.pageY+'px">' +
                                            '<h6>'+$(this).data().state+'</h6>' +
                                            '<p>'+$(this).data().text+'</p>' +
                                        '</div>'
                                    );*/
                                }
                                else
                                {
                                    var thisClass = $(this).attr("class").split(' ')[1];
                                    
                                    self.main.selectAll(".state:not(."+thisClass+")")
                                        .transition()
                                            //.delay(50)
                                            //.duration(500)
                                            .style("opacity", '0.60');
                                    
                                    $("."+thisClass).on("touchstartoutside mouseout", function(){
                                        self.main.selectAll(".state:not(."+thisClass+")")
                                            .transition()
                                                //.delay(50)
                                                //.duration(500)
                                                .style("opacity", '1');
                                    });
                                    /*$("body").append(
                                        '<div class="tooltip" style="left:'+e.pageX+'px;top:'+e.pageY+'px">' +
                                            '<h6>'+$(this).data().state+'</h6>' +
                                        '</div>'
                                    );*/
                                }
                            });
                            
                            // Remove tooltip once mouse leaves a state
                            $("svg").on("touchstartoutside mouseout", function(e){
                                //$(".tooltip").remove();
                            });
                        }
                    });
            
           if (self.options.mapclickcallback){
                $("#"+self.options.graph+" .state").on("click", function(e){
                    var parts = self.options.mapclickcallback.split('.')
                    var fn = window[parts[0]];
                    for (var i=1; i < parts.length; i++)
                        fn = fn[parts[i]];

                    d3.select("#"+self.options.graph+" .state.active").attr('class', function(){
                        var classes = $(this).attr('class');
                        classes = classes.replace('active', '');
                        return classes;
                    });
                    d3.select(this).attr('class', function(){
                        var classes = $(this).attr('class');
                        classes+= ' active';
                        return classes;
                    });

                    if (typeof fn == 'function')
                        return  fn(e);
                    return false;
                });
            }
        });
        
    }
    /***/
    
    /**
     * @function: graphBubbleDonut
     * @description: Render bubble donut graph
     */
    this.graphBubbleDonut = function(){
        
        var w = self.parameters.width;
        var h = (w * .5);
        self.svg.attr("height", h + 35);
        
        if(self.options.racetype == 'senate'){
            
            var innerRadius = w * .25;
            var outerRadius = w * .5;
            
        } else {
            
            var innerRadius = w * .32;
            var outerRadius = w * .5;
        }
        self.svg.style("opacity", 0);
        
        self.svg.select('.main').attr('transform', "translate(0, 35)");
        
        var majority = self.svg.select('.main').append("g").attr("class", "majority");
        var arcGroup = self.svg.select('.main').append("g").attr("class", "arcGroup");
        var textGroup = self.svg.select('.main').append("g").attr("class", "textGroup");
        var circlesGroup = self.svg.select('.main').append("g").attr("class", "circleGroup");
        
        /** ADD MAJORITY LINES **/
       
        var lineFunction = d3.svg.line()
            .x(function(d){
                return d.x;
            })
            .y(function(d){
                return d.y;
            })
            .interpolate("linear");
                      
        majority.append("text")
            .attr("class", "majorityText")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .attr("fill", "black")
            .text("Majority Line");
            
        majority.select("text")
            .attr("transform", function(){
                var textBox = d3.select(this).node().getBBox();
                return "translate("+(w-textBox.width)/2+", -16)";
            });
            
        if(self.options.racetype == 'senate'){
            var path = [
                {x: w/2 + 2, y: -10},
                {x: w/2 + 1, y: innerRadius}
            ];
        } else {
            var heightofNode = ((h - innerRadius)/15);
            var path = [
                {x: w/2 + (w/(29*2)), y:-10},
                {x: w/2 + (w/(29*2)), y: 9 * heightofNode + 0.49 * 9 * heightofNode},
                {x: w/2 - w/29 +8, y: 9 * heightofNode + 0.49 * 9 * heightofNode}
            ];
        }
        
        majority.append("path")
            .attr("d", lineFunction(path))
            .attr("stroke", "black")
            .attr("fill", "none")
            .attr("class", "majorityLine");
        
        /** CREATE CIRCLE GROUPS **/
        var demData = null;
        var repData = null;
        var indptData = null;
        var noneData = null;
        
        for(index in self.options.data){
            switch(self.options.data[index].party){
                case 'democrat':
                    demData = self.options.data[index];
                    break;
                case 'republican':
                    repData = self.options.data[index];
                    break;
                case 'independent':
                    indptData = self.options.data[index];
                    break;
                case 'none':
                    noneData = self.options.data[index];
                    break;
            }
        }
        
        /** CREATE IN ORDER OF
            DEMOCRAT CLOSED
            INDPT CLOSED
            DEMOCRAT (O) SECURED
            DEMOCRAT (O) MIDDLE
            DEMOCRAT (O) LEANING
            CLOSED
            INDPT (0) SECURED/MIDDLE/LEANING
            REPUBLICAN (O) LEANING
            REPUBLICAN (O) MIDDLE
            REPUBLIC (O) SECURED
        **/
        if(demData && demData.closed){
            this.addBubblesIntoGraph(circlesGroup, demData,  "democrat", "closed", w, h);
        }
        if(indptData && indptData.closed){
            this.addBubblesIntoGraph(circlesGroup, indptData, "independent", "closed", w, h);
        }
        if(demData && demData.open){
            this.addBubblesIntoGraph(circlesGroup, demData,  "democrat", "open", w, h);
        }
        if(indptData && indptData.open){
            this.addBubblesIntoGraph(circlesGroup, indptData, "independent", "open", w, h);
        }
        if(noneData && noneData.open){
            this.addBubblesIntoGraph(circlesGroup, noneData, "none", "open", w, h);
        }
        if(repData && repData.open){
            this.addBubblesIntoGraph(circlesGroup, repData, "republican", "open", w, h);
        }
        if(repData && repData.closed){
            this.addBubblesIntoGraph(circlesGroup, repData, "republican", "closed", w, h);
        }
        
        var counter = 0;
        var row = 0;
        
        var testAppend = circlesGroup.append("g")
            .attr("class", "group row"+row);
        circlesGroup.selectAll("circle").each(function(d, i){
            var correct = i+1;
            var circle = d3.select(this);
            var element = $("#" + self.options.id + " #"+circle.attr("id")).detach();
            $("#"+self.options.id + " .circleGroup .row" +row).append(element);
            
            if(self.options.racetype == 'senate'){
                if(correct%5 == 0){
                    row++;
                    testAppend = circlesGroup.append("g").attr("class", "group row"+row);
                }
            } else {
                if(correct % 15 == 0){
                    row++;
                    testAppend = circlesGroup.append("g").attr("class", "group row"+row);
                }
            }
            
        });
        
        circlesGroup.selectAll(".group").each(function(d, i){
            
            var groupElement = d3.select(this);
            
            groupElement.selectAll("circle").each(function(d, j){
                d3.select(this).attr("cx", function(){
                    
                    var node = d3.select(this).node().getBBox();
                    
                    var numberofNodes = 5;
                    var padding = 0.6;
                    if(self.options.racetype == 'house'){
                        numberofNodes = 15;
                        padding = 0.3;
                    }
                    
                    var value =  innerRadius - node.width/2 - (j%numberofNodes) * node.width;
                    if(j%numberofNodes != 0)
                        value -= (node.width * (j%numberofNodes) * padding);
                    return value;
                });
            });
            
            groupElement.attr("transform", function(){
                var rotateValue = 9 * i;
                if(self.options.racetype == 'house')
                    rotateValue = 6.21*i;
                
                return "rotate(" + rotateValue + ")"+"translate("+ -outerRadius + ")";
            });
        });
        
        circlesGroup.attr("transform", function(){
            var transformString = "translate("+ outerRadius + "," + h + ")";
            if(self.options.racetype == 'senate')
                transformString += "rotate(5)";
            else 
                transformString += "rotate(3)";
            return transformString; 
        });
        
        /** CREATES ARCS (only for senate) **/
        if(self.options.racetype == 'senate'){
            
            // check where last democrat/independent closed is
            var $leftMostClosed = null;
            if($('#'+self.options.id + ' .circleGroup .group .bubble.independent.closed:last').length>0){
                $leftMostClosed = $('#'+self.options.id + ' .circleGroup .group .bubble.independent.closed:last');
            } else if($('#'+self.options.id + ' .circleGroup .group .bubble.democrat.closed:last').length>0){
                $leftMostClosed = $('#'+self.options.id + ' .circleGroup .group .bubble.democrat.closed:last');
            }
            if($leftMostClosed){
                this.appendClosedArcs($leftMostClosed, 'left', arcGroup, w, h, innerRadius, outerRadius);
            }
            
            var $rightMostClosed = null;
            if($('#'+self.options.id + ' .circleGroup .group .bubble.republican.closed:last').length>0){
                $rightMostClosed = $('#'+self.options.id + ' .circleGroup .group .bubble.republican.closed:first');
            }
            if($rightMostClosed){
                this.appendClosedArcs($rightMostClosed, 'right', arcGroup, w, h, innerRadius, outerRadius);
            }
        }
        
        /** CREATES TEXT **/
        var title = textGroup.append("text")
            .text(function(d) {
                if(self.options.racetype == 'senate')
                    return "SENATE";
                else
                    return "HOUSE";
            })
            .attr("class", "raceText")
            .attr("font-size", function(){
                if(njHelper.isDesktop())
                    return "26px";
                if(njHelper.isTablet())
                    return "22px";
                return "16px";
            })
            .attr("font-weight", "bold")
            .style("font-family", "freight");
        
        var wrapper = textGroup.append("text")
            .attr("class", "subText")
            .attr("font-size", function(){
                if(njHelper.isDesktop())
                    return "26px";
                if(njHelper.isTablet())
                    return "22px";
                return "16px";
            })
            .attr("font-weight", "bold");
                    
        wrapper.append("tspan")
            .text(function(){
                return self.options.data.numDemocrats;
            })
            .attr("class", "totalDemSeats")
            .attr("fill", "#277EC3")
            .attr("x", 0)
            .attr("dx", 0)
            
        wrapper.append("tspan")
            .text(function(){
                return self.options.data.numIndependents;
            })
            .attr("class", "totalIndSeats")
            .attr("fill", "#CD9300")
            .attr("dx", 10);
            
        wrapper.append("tspan")
            .text(function(){
                return self.options.data.numRepublicans;
            })
            .attr("class", "totalRepSeats")
            .attr("fill", "#EE2128")
            .attr("dx", 10);
            
        var secured = textGroup.append("text")
            .attr('class', 'securedLabel')
            .attr('font-size', '12px')
            .text('Secured');
        
        self.svg.selectAll(".textGroup text")
            .attr("transform", function(d,i){
                var node = d3.select(this).node().getBBox();
                var translateX = (w-node.width)/2;
                var translateY = (h - (node.height) + (i*node.height) - 10);
                if(i != 0)
                    translateY -= 5; // reduce padding between text
                return "translate("+translateX+","+ translateY +")"
            });
        
        
        /** LINES OF DEMOCRATIC/REPUBLICAN THAT APPEAR ONLY ON SENATE CHAMBER **/
        if(self.options.racetype == 'senate'){
            var repubMajority = self.svg.select('.main').append("g").attr("class", "repMajority");
            var demMajority = self.svg.select('.main').append("g").attr("class", "demMajority");
              
            // DEMOCRATIC LINE                  
            var demText = demMajority.append("text")
                .attr("class", "demText")
                .attr("font-size", function(){
                    if(njHelper.isPhone())
                        return "11px";
                    return "14px";
                })
                .attr("fill", "gray");
            demText.append("tspan").text("3/5");
            demText.append("tspan").text("Democratic");
            
            var demPath = [
                {x: w/2 + (w/20)*3 + (w/20)*3*0.15, y: 15},
                {x: w/2 + (w/20)*2 - (w/20)*2*0.20, y: innerRadius+5}
            ];
            
            demMajority.append("path")
                .attr("d", lineFunction(demPath))
                .attr("stroke", "black")
                .attr("fill", "none")
                .attr("stroke", "gray")
                .attr("class", "majorityDemLine");
                
            // LINE UP TEXT CORRECTLY
            var prevSpan = null;
            demMajority.select("text")
                .attr("x", function(){
                    //20 -> number of rows in senate
                    return w/2 + (w/20)*3;
                })
                .attr("y", -5);
                
            demMajority.selectAll("tspan").each(function(d, i){
                 var theSpan = d3.select(this);
                 $this = $(this);
                 
                 theSpan
                    .attr("x", function(){
                        return w/2 + (w/20)*3 + 5;
                    })
                    .attr("dy", function(){
                        if(njHelper.isPhone())
                            return 8 * i;
                        return 12 * i;
                    });
                 
                 if(prevSpan){
                    var bbox = prevSpan;
                    theSpan.attr("dx", function(){
                        return -(($this.width() - bbox.width())/2)
                    });    
                 }
                 prevSpan = $this;
            });
        
            // REPUBLICAN LINE-
            var repubText = repubMajority.append("text")
                .attr("class", "repubText")
                .attr("font-size", function(){
                    if(njHelper.isPhone())
                        return "11px";
                    return "14px";
                })
                .attr("fill", "gray");
            repubText.append("tspan").text("3/5");
            repubText.append("tspan").text("Republican");
            
            prevSpan = null;
            var repPath = [
                // 20 -> number of rows in senate
                {x: w/2 - (w/20)*3 - 4, y: 10},
                {x: w/2 - (w/20)*2 + (w/20) * 2 * 0.25, y: innerRadius+5}
            ];
            
            repubMajority.append("path")
                .attr("d", lineFunction(repPath))
                .attr("stroke", "gray")
                .attr("fill", "none")
                .attr("class", "majorityRepLine");
        
            repubMajority.select("text")
                .attr("x", function(){
                    return  w/2 - (w/20)*4;
                })
                .attr("y", -5);
                
           repubMajority.selectAll("tspan").each(function(d, i){
                    var theSpan = d3.select(this);
                    var $this = $(this);
                     theSpan
                        .attr("x", function(){
                            return w/2 - (w/20)*4;
                        })
                        .attr("dy", function(){
                            if(njHelper.isPhone())
                                return 8 * i;
                            return 12 * i;
                        });
                     
                     if(prevSpan){
                        var bbox = prevSpan;
                        theSpan.attr("dx", function(){
                            return -(($this.width() - bbox.width())/2);
                        });
                     }
                     prevSpan = $this;
                });
        }
        
        /** INTERACTIVE **/
        if (self.options.interactive) {
           
            $(document).on("click touchstart mouseover", '#'+self.options.id+" .circleGroup .bubble", function(e){
                if(njHelper.isDesktop()){
                
                    if ($('#njGraphichoverActionDisplay').length){
                        $('#njGraphichoverActionDisplay').remove();
                        $('#njGraphichoverActionDisplay').unbind('clickoutside touchstartoutside');
                    }
                    
                    var $this = $(this);
                    // stroke circle
                    $this.attr('stroke', 'black');
                    $this.attr('stroke-width', "1px");
                    
                    var hasIncumbent = false;
                    var election = $this.data().election;
                    if(election.type == 'closed'){
                        var html = '';
                        html+= '<div id="njGraphichoverActionDisplay">';
                        html+=      '<span class="bRaceName">'+election.raceName+'</span>';
                        html+=          '<span class="notup">Not Up for Election in 2014</span>';
                        
                        html+=      '<div class="candBubbleWrapper">';
                        html +=         '<div class="bCand winner">';
                        
                        html +=             '<span class="bCandName closed">'+election.candidate;
                            
                        if(election.party == 'Dem')
                            html+= '&nbsp;(D)';
                        else if(election.party == 'Rep')
                            html+='&nbsp;(R)';
                        else
                            html+='&nbsp;(I)';
                            
                        html +=             '</span>';
                        html +=         '</div>';
                        html+=      '</div>';
                        html+= '</div>';
                    } else if(election.type=='open' && election.candidates) {
                        var html = '';
                        var winner = null;
                        
                        html+= '<div id="njGraphichoverActionDisplay">';
                        html+=      '<span class="bRaceName">'+election.raceName+'</span>';
                        
                        for(index in election.candidates){
                            if(election.candidates[index].winner && election.candidates[index].winner != null){
                                winner = election.candidates[index];
                                break;
                            }
                        }
                        
                        if(election.percentReporting || winner){
                            html+= '<span class="pReporting">';
                            
                            if(election.percentReporting == 100 || (winner && election.totalVotes == 0 && election.candidates.length == 1)){
                                if(winner && winner.winner == 'X')
                                    html += 'Final';  
                                else if(winner && winner.winner == 'R')
                                    html += 'Pending: Runoff'; 
                                else
                                    html += 'Pending';
                            }
                            else{
                                if(winner && winner.winner == 'X'){
                                    if(election.percentReporting == 0)
                                        html += 'Called: 0% reporting';
                                    else if(election.percentReporting < 1)
                                        html += 'Called: <1% reporting';
                                    else
                                        html+=      'Called: ' + election.percentReporting.toFixed(1)+'% reporting';   
                                }
                                else {
                                    if(winner && winner.winner == 'R')
                                        html += 'Pending: Runoff';
                                    else
                                        html+=      'Pending: ' + election.percentReporting.toFixed(1)+'% reporting';   
                                }    
                            }  
                                       
                            html+= '</span>';                   
                        }
                        else
                            html+= '<span class="pReporting">0% reporting</span>';
                        html+=      '<div class="candBubbleWrapper">';
                        
                        for(index in election.candidates){
                            html += '<div class="bCand';
                            
                            if(election.candidates[index].winner && election.candidates[index].winner != null)
                                html += ' winner">';
                            else
                                html += '">';
                            
                            html += '<span class="bCandName open">';
                            html +=  election.candidates[index].name;
                            
                            if(election.candidates[index].party == 'Dem')
                                html+= '&nbsp;(D)';
                            else if(election.candidates[index].party == 'GOP')
                                html+='&nbsp;(R)';
                            else
                                html+='&nbsp;(I)';
                                
                            if(election.candidates[index].incumbent){
                                html += '*';   
                                hasIncumbent = true;
                            }
                            
                            html += '</span>';
                            
                            html += '<span class="bCandPercent">';
                            if(election.candidates[index].voteCount && election.candidates[index].voteCount > 0)
                                html += ((election.candidates[index].voteCount / election.totalVotes) * 100).toFixed(1) + '%';
                            else if(election.candidates[index].voteCount == 0 && election.candidates[index].winner == 'X' && election.candidates.length == 1)
                                html += 'Unc.';
                            else
                                html += '0%';
                            html += '</span>';
                            
                            html += '</div>';
                        }
                        
                        html+=      '</div>';
                        
                        if(hasIncumbent)
                            html += '<div class="popupNote">* denotes incumbent</div>';
                        
                        html+= '</div>';
                    }
                    
                    $('#'+self.options.id).append(html);
                    var graphWidth = $('#'+self.options.id+' svg').width();
                    var graphOffset = $('#'+self.options.id+' svg').position();
                    var leftOffset = $this.position().left + 15;
                    var popupWidth = $('#'+self.options.id + ' #njGraphichoverActionDisplay').width();
                    if((leftOffset + popupWidth) > (graphWidth + graphOffset.left))
                        leftOffset = leftOffset - popupWidth - 40;
                    $('#njGraphichoverActionDisplay').css({
                        top: e.offsetY,
                        left: leftOffset
                    });
                    
                    $this.bind('clickoutside mouseout touchstartoutside', function(){
                        $('#njGraphichoverActionDisplay').remove();
                        $this.unbind('clickoutside mouseout touchstartoutside');
                        $this.removeAttr('stroke');
                        $this.removeAttr('stroke-width');
                    });
                }
            });
        }
          
        /** ANIMATION FADE IN **/
        self.svg.transition()
            .delay(250)
            .duration(1000)
            .style("opacity", 1);
    }
    /***/
   
   /**
    * @function:appendClosedArcs
    * @var bubbleElement,
    * @description: creates the arcs that represent the closed elections in the chamber graph
    */
    this.appendClosedArcs = function(bubbleElement, direction, arcGroup, w, h, innerRadius, outerRadius){
        var $parent = bubbleElement.parent();
        var parentClassesArray = $parent.attr('class').split(" ");
        var row = null;
        var indexBubble = bubbleElement.index() + 1; // since starts at 0, increment by 1
        for(index in parentClassesArray){
            if(parentClassesArray[index].indexOf("row") > -1){
                row = parseInt(parentClassesArray[index].replace("row",'')) + 1; // since starts at 0, increment by 1
                break;
            }
        }
        
        if(row){
            var mainClosed = null;
            var offsetClosed = null;
            if(indexBubble != 5){
                mainClosed = d3.svg.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius)
                    .startAngle(function(){
                        if(direction =='left')
                            return 0;
                        return ((9*(row))+0.5) * (Math.PI/180);
                    })
                    .endAngle(function(){
                        if(direction == 'left')
                            return (((9*(row-1))+0.5) * (Math.PI/180));
                        return (180 * (Math.PI/180));
                    }); // 9 * i 
                    
                offsetClosed = d3.svg.arc()
                    .innerRadius(function(){
                        if(direction =='left')
                            return innerRadius;
                        return (outerRadius - ((outerRadius-innerRadius) * ((6-indexBubble)/5)));    
                    })
                    .outerRadius(function(){
                        if(direction == 'left')
                            return (innerRadius + ((outerRadius-innerRadius) * (indexBubble/5)));
                        return outerRadius;
                    })
                    .startAngle(function(){
                        if(direction == 'left')
                            return 0;
                        return (((9*(row-1))+0.5) * (Math.PI/180));
                    })
                    .endAngle(function(){
                        if(direction == 'left')
                            return (((9*row)+0.5) * (Math.PI/180));
                        return (180 * (Math.PI/180));
                    }); // 9 * i  
            } else {
                mainClosed = d3.svg.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius)
                    .startAngle(function(){
                        if(direction == 'left')
                            return 0;
                        return (((9*(row-1))+0.5) * (Math.PI/180));
                    })
                    .endAngle(function(){
                        if(direction == 'left')
                            return (((9*row)+0.5) * (Math.PI/180));
                        return (180 * (Math.PI/180));
                    }); // 9 * i 
            }
            
            if(mainClosed){
                arcGroup.append("path")
                    .attr("d", mainClosed)
                    .attr("class", "closedArc"+direction)
                    .attr("fill", "lightgray")
                    .attr("transform", function(){
                        return "translate("+w/2+","+ h +")rotate(-90)";    
                    });
            }
            if(offsetClosed){
                arcGroup.append("path")
                    .attr("d", offsetClosed)
                    .attr("class", "offsetClosedArc"+direction)
                    .attr("fill", "lightgray")
                    .attr("transform", function(){
                        return "translate("+w/2+","+ h +")rotate(-90)";    
                    });    
            }
        }
    }
    
    /**
     * @function: topLegend
     * @var: string keys
     * @description: Append a color legend above the SVG
     */
    this.topLegend = function(keys){
        // Place the legend keys in a div above the svg
        var legend = self.div.insert('div', "svg")
            .attr("class", 'legend')
            .style("opacity", 0);
        legend.selectAll(".legend")
            .data(keys)
            .enter()
            .append('text')
                .attr("class", function(d) { return 'key_'+self.parameters.colors(d) + ' key'; })
                .style("display", function(d){
                    var ref = "" + d;
                    if(ref.toLowerCase().indexOf("hide") > -1){
                        return 'none';
                    }
                    return 'initial';
                })
                .style("background-color", function(d) { 
                    if(self.options.colorscheme=='raceline'){
                        return '#'+self.parameters.raceLineColors(d);
                    }
                    if(self.options.colorscheme=='racetracker'){
                        return '#'+self.parameters.raceTrackerColors(d);
                    }
                    if(self.options.colorscheme=='sector'){
                        return '#'+self.parameters.sGraphColors(d);
                    }
                    if(self.options.colorscheme=='socialmedia'){
                        if(d == 'Facebook Fans'){
                            return self.parameters.socialMediaColors['facebook'];
                        }
                        else{
                            return self.parameters.socialMediaColors['twitter'];
                        }
                    }
                    return '#'+self.parameters.colors(d); })
                .text(function(d) { return d; });
        
        // Ease in on load
        legend.transition()
            .delay(250)
            .duration(1000)
            .style("opacity", 1);
    }
    /***/
    
    /**
     * @function: insideLegend
     * @var: string keys
     * @description: Append a color legend inside the SVG, inside the graph
     */
    this.insideLegend = function(keys){
        // Create legend container
        var legend = self.svg.append('g')
            .attr("class", 'legend')
            .style("opacity", 0);
        
        // Enter data
        var key = legend.selectAll(".legend")
            .data(keys)
            .enter();
        
        // Create and position key color
        key.append('rect')
            .attr("class", function(d) { return 'key_'+self.parameters.colors(d) + ' key'; })
            .attr("x", self.parameters.areaWidth - self.parameters.margin.right - 15)
            .attr("y", function(d, i) { return (i * 20) + self.parameters.margin.top ; })
            .attr("width", 15)
            .attr("height", 15)
            .style("display", function(d){
                var ref = "" + d;
                if(ref.toLowerCase().indexOf("hide") > -1){
                    return 'none';
                }
                return 'initial';
            })
            .style("fill", function(d) { return '#'+self.parameters.colors(d); });
        
        // Print the label beside the key
        key.append('text')
            .attr("class", function(d) { return 'key_'+self.parameters.colors(d) + ' key'; })
            .attr("x", self.parameters.areaWidth - self.parameters.margin.right - 20)
            .attr("y", function(d, i) { return (i * 20) + self.parameters.margin.top + 11; })
            .style("text-anchor", 'end')
            .text(function(d) { return d; });
        
        // Ease in on load
        legend.transition()
            .delay(250)
            .duration(1000)
            .style("opacity", 1);
    }
    /***/
    
    /**
     * @function: outsideLegend
     * @var: string keys
     * @description: Append a color legend inside the SVG to the right of the graph (or above on mobile)
     */
    this.outsideLegend = function(keys){
        // Create container
        var legend = self.svg.append('g')
            .attr("class", 'legend')
            .style("opacity", 0);
        
        // Render the keys
        var key = legend.selectAll(".legend")
            .data(keys)
            .enter();
        key.append('rect')
            .attr("class", function(d) { return 'key_'+self.parameters.colors(d) + ' key'; })
            .attr("y", function(d, i) { return i * 20; })
            .attr("width", 15)
            .attr("height", 15)
            .style("display", function(d){
                var ref = "" + d;
                if(ref.toLowerCase().indexOf("hide") > -1){
                    return 'none';
                }
                return 'initial';
            })
            .style("fill", function(d) { return '#'+self.parameters.colors(d); });
        key.append('text')
            .attr("class", function(d) { return 'key_'+self.parameters.colors(d) + ' key'; })
            .attr("x", 20)
            .attr("y", function(d, i) { return (i * 20) + 11; })
            .text(function(d) { return d; });
        
        // Update graph width to make room for the legend
        var legendAttr = self.svg.select(".legend").node().getBBox();
        if (njHelper.isPhone()) {
            self.parameters.height -= legendAttr.height + 10;
            self.parameters.margin.top += legendAttr.height + 10;
        } else {
            self.parameters.width -= legendAttr.width + 10;
            self.parameters.margin.right += legendAttr.width + 10;
            
            legend.attr("transform", 'translate(' + (self.parameters.width + self.parameters.margin.left + 10) + ',0)');
        }
    
        // Ease in on load
        legend.transition()
            .delay(250)
            .duration(1000)
            .style("opacity", 1);
    }
    /***/
    
    /**
     * @function: discreteLegend
     * @description: Append a legend listing map keys individually
     */
    this.discreteLegend = function(){
        // Create container
        var legend = self.svg.append('g')
            .attr("class", 'legend')
            .style("opacity", 0);
        
        // Render the keys
        var key = legend.selectAll(".legend")
            .data(['dem', 'rep', '3rd'])
            .enter()
            .append("g")
                .attr("class", 'key');
        key.append('rect')
            .attr("x", 0)
            .attr("y", 10)
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", function(d) { return self.parameters.partyColors(d); });
        key.append('text')
            .attr("x", 20)
            .attr("y", 12)
            .attr("dy", '.85em')
            .text(function(d) { return self.parameters.partyNames(d); });
        
        // Arrange the keys next to one another
        var totalWidth = 0;
        key.attr("transform", function(d,i) {
            var nth = parseInt(i) + 1;
            var keyWidth = self.svg.select(".key:nth-of-type("+nth+")").node().getBBox().width + 10;
            totalWidth += keyWidth;
            var startsAt = totalWidth - keyWidth;
            return 'translate('+startsAt+',0)';
        });
        
        // Update graph width to make room for the legend
        legend.attr("transform", 'translate(' + (self.parameters.width - legend.node().getBBox().width) + ',0)');
        
        // Ease in on load
        legend.transition()
            .duration(800)
            .style("opacity", 1);
    }
    /***/
    
    /**
     * @function: politicalLegend
     * @description: Append a custom legend design with full scale of political map keys
     */
    this.politicalLegend = function(){
        // Form and place container
        var legend = self.svg.append('g')
            .attr("class", 'legend')
            .attr("transform", 'translate(' + (self.parameters.width-350) + ',0)')
            .style("opacity", 0);
        
        // Location of "other" group
        var otherPlace = 'translate(60,70)';
        
        // Scale to fit depending on map size
        if (self.parameters.width < 950) {
            self.svg.attr("height", self.parameters.height+50);
            self.main.attr("transform", 'translate(0,50)');
            if (self.parameters.width < 410)
                legend.attr("transform", 'translate(0,0)scale(0.75)');
            else
                legend.attr("transform", 'translate(' + (self.parameters.width/2 - 200) + ',0)');
            otherPlace = 'translate(250,10)';
        }
        
        // Construct color array for dem and rep colors
        var scale = legend.selectAll(".legend")
            .data(['dem', 'rep'])
            .enter()
            .append('g');
            
            scale.attr("class", function(d) { return d + ' scale'; })
                .attr("transform", function(d,i) { return 'translate(' + i*125 + ',0)'; })
                .append('text')
                    .attr("x", 50)
                    .attr("y", 50)
                    .style("text-anchor", 'middle')
                    .text(function(d) { return self.parameters.partyNames(d); });
            
            var key = scale.selectAll(".scale")
                .data(function(d) { return [d+'++', d+'+', d, d+'-', d+'--']; })
                .enter()
                .append("g")
                    .attr("class", 'key');
            
            key.append('rect')
                .attr("x", function(d,i) { return i*20; })
                .attr("y", 10)
                .attr("width", 20)
                .attr("height", 20)
                .style("fill", function(d) { return self.parameters.partyColors(d); });
        
        // Standard construction for "other" labels
        var other = legend.append('g')
            .attr("class", 'other scale')
            .attr("transform", otherPlace)
            .selectAll(".legend")
            .data(['3rd', ''])
            .enter();
            
            other.append('rect')
                .attr("x", 0)
                .attr("y", function(d,i) { return i*18; })
                .attr("width", 13)
                .attr("height", 13)
                .style("fill", function(d) { return self.parameters.partyColors(d); });
            
            other.append('text')
                .attr("x", 20)
                .attr("y", function(d,i) { return i*18; })
                .attr("dy", '.75em')
                .text(function(d) { return self.parameters.partyNames(d); });
        
        // Ease in on load
        legend.transition()
            .delay(250)
            .duration(1000)
            .style("opacity", 1);
    }
    /***/
    
    /***
     * @function: convertToImg
     * @description: Structure SVG data and style into savable svn and png images
     */
    this.imageConvert = function(){
        // Import the graphic style rules
        var style = '';
        $.ajax({
            url: '/css/graphic/svg.min.css',
            async: false,
            success: function (data){
                style = data;
            },
            error: function(e){
                console.log(e);
            }
        })
        
        // Pass style rules to the image internally
        $div.find("svg").prepend('<xhtml:link href="data:text/css;charset=utf-8;base64,' + btoa(style)+'" rel="stylesheet" type="text/css"/>');
        
        // Add XML attributes and select the SVG
        var html = self.svg
            .attr("xmlns", 'http://www.w3.org/2000/svg')
            .attr(["xmlns:xlink"], 'http://www.w3.org/1999/xlink')
            .attr(["xmlns:xhtml"], 'http://www.w3.org/1999/xhtml')
            .node().outerHTML;
        
        // Form containers to hold images
        var div = self.div.append('div')
            .attr("id", 'imagePreview')
            .attr("style", 'max-height:' + ($(window).height() - 20)+'px');
        div.append('h5')
            .text('SVG');
        div.append('div')
            .attr("id", 'svgdataurl');
        div.append('h5')
            .text('PNG');
        div.append('div')
            .attr("id", 'pngdataurl');
        div.append('canvas')
            .attr("width", self.parameters.areaWidth)
            .attr("height", self.parameters.areaHeight)
            .attr("style", 'display:none');
        div.append('div')
            .attr("id", 'close')
            .text('X');
            
        $(document).on("click", "#close", function(){
            $("#imagePreview, #close, svg xhtml\\:link").remove();
        })
        
        // Render the SVG XML as an .svg image
        var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);
        var img = '<img src="'+imgsrc+'">';
        d3.select("#svgdataurl").html(img);
        
        // Render the .svg image as an HTML canvas
        var canvas = document.querySelector("canvas"),
        context = canvas.getContext("2d");
        
        var image = new Image;
        image.src = imgsrc;
        image.onload = function() {
            context.drawImage(image, 0, 0);
            
            // Render the HTML canvas as a .png image
            var canvasdata = canvas.toDataURL("image/png");
            
            var pngimg = '<img src="'+canvasdata+'">'; 
            d3.select("#pngdataurl").html(pngimg);
        };
    }

    /***
     * @function: removeActiveMapState
     * @description: allow binding to call to remove active state
     */
    this.removeActiveMapState = function(){
        d3.select("#"+self.options.graph+" .state.active").attr('class', function(){
            var classes = $(this).attr('class');
            classes = classes.replace('active', '');
            return classes;
        });
    }
    
    /***
     * @function: removeActiveMapState
     * @description: allow binding to call to remove active state
     */
    this.setActiveMapState = function(state){
       self.removeActiveMapState();
       if (d3.select("#"+self.options.graph+" .state."+state).length){
          d3.select("#"+self.options.graph+" .state."+state).attr('class', function(){
               var classes = $(this).attr('class');
               classes+= ' active';
               return classes;
           });
       }
    }
    
    this.addBubblesIntoGraph = function(graph, group, party, type, width, height){
        
        var innerRadius = width * .25;
        var outerRadius = width * .5;
        
        if(party == 'republican'){
            var order = ['leaning', 'middle', 'secured'];
        }else{
            var order = ['secured', 'middle', 'leaning'];
        }
        
        if(type == 'closed'){
            for(var i = 0; i < 3; i++){
                if(group.closed[order[i]]){
                    var color = this.parameters.bubbleGraphPartyColors[party][group.closed[order[i]].leaning];
                    graph.selectAll("g")
                        .data(group.closed[order[i]].data)
                        .enter()
                        .append("circle")
                            .attr('fill', color)
                            .attr('r', function(d){
                                if(self.options.racetype == 'senate')
                                    return ((outerRadius - innerRadius)/10) * .65;
                                else    
                                    return ((outerRadius - innerRadius)/30);
                            })
                            .attr('class', function(d){
                                var classname = 'bubble closed ' +party+ ' election'+d.id;
                                if(d.type)
                                    classname += ' clickable';
                                return classname;
                            })
                            .attr('id', function(d){
                                return 'election'+d.id;
                            })
                            .attr('data-election', function(d){
                                return JSON.stringify(d);
                            });
                }
            }    
        } else {
            for(var i = 0; i < 3; i++){
                if(group.open[order[i]]){
                    var color = this.parameters.bubbleGraphPartyColors[party][group.open[order[i]].leaning];
                    graph.selectAll("g")
                        .data(group.open[order[i]].data)
                        .enter()
                        .append("circle")
                            .attr('fill', color)
                            .attr('r', function(d){
                                if(self.options.racetype == 'senate')
                                    return ((outerRadius - innerRadius)/10) * .65;
                                else    
                                    return ((outerRadius - innerRadius)/30);
                            })
                            .attr('class', function(d){
                                var classname = 'bubble open ' +party+ ' election'+d.id;
                                if(d.candidates)
                                    classname += ' clickable';
                                return classname;
                            })
                            .attr('id', function(d){
                                return 'election'+d.id;
                            })
                            .attr('data-election', function(d){
                                return JSON.stringify(d);
                            });
                }
            } 
        }
    }
    
    /***/
    
    /***
     * EVENTS
     */
    // Listen for resizeend, reform graph if new width is different from current
    $(window).resizeend({
        onDragEnd: function(){
            if ($('#'+self.options.graph).width() != self.parameters.areaWidth) {
                self.setParams();
                self.constructSVG();
            }
        }
    })
    /***/
    
    self.init();
}
