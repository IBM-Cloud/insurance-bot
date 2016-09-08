// Generate random, unique customer ID on page load
function uuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + s4() + s4();
}
var customerId = uuid();

var PolicyBuilder = function () {

};

PolicyBuilder.prototype.selectedCriteria = [];

PolicyBuilder.prototype.DURATION = 0;
PolicyBuilder.prototype.PEOPLE = 1;
PolicyBuilder.prototype.REVIEWS = 2;
PolicyBuilder.prototype.COST = 3;
PolicyBuilder.prototype.CANCELLATION = 4;
PolicyBuilder.prototype.VALUE = 5;
PolicyBuilder.prototype.MAXCATEGORY = 6;

PolicyBuilder.prototype.criteria = [];

PolicyBuilder.prototype.radarStatus = false;

// Radar values
PolicyBuilder.prototype.MINCATEGORY = 0;
PolicyBuilder.prototype.RADAR_COST = 0;
PolicyBuilder.prototype.RADAR_LEVELCARE = 1;
PolicyBuilder.prototype.RADAR_COVERAGE = 2;
PolicyBuilder.prototype.RADAR_CANCELLATION = 3;
PolicyBuilder.prototype.RADAR_REVIEW = 4;
PolicyBuilder.prototype.MAXCATEGORY = 5;
PolicyBuilder.prototype.columns = [];
PolicyBuilder.prototype.policies = [];
PolicyBuilder.prototype.radarColors = [[247, 127, 29], [18, 170, 235], [170, 235, 18], [235, 18, 170], [18, 61, 234], [152, 78, 0]];


PolicyBuilder.prototype.selectCriteria = function (label) {

    var newSelections = [];

    var found = false;

    this.selectedCriteria.forEach(function (criteria) {

        if (criteria === label) {
            found = true;
            var element = document.getElementById(label);
            element.className = 'criteria';
        } else {
            newSelections.push(criteria);
            var element = document.getElementById(criteria);
            element.className = 'selectedCriteria';
        }
    })

    if (found === false) {
        newSelections.push(label);
        var element = document.getElementById(label);
        element.className = 'selectedCriteria';
    }

    this.selectedCriteria = newSelections;

    var processButton = document.getElementById('process');
    var instructions = document.getElementById('instructions');

    if (this.selectedCriteria.length > 0) {
        processButton.disabled = false;
        instructions.innerHTML = 'Press the evaluate button when ready';
    } else {
        processButton.disabled = true;
        instructions.innerHTML = 'Select your travel insurance priorities';
    }
}

PolicyBuilder.prototype.makeCritria = function (label, image) {

    var element = document.createElement('div');
    element.className = 'criteria';
    element.id = label;
    element.innerHTML = '<img src = "images/wash/' + image + '" class = "criteria-image">' +
        '<label class = "label">' + label + '</label>';

    var pb = this;
    element.onclick = function () {
        pb.selectCriteria(label)
    };
    return element;
}

PolicyBuilder.prototype.addCriteria = function () {

    var elements = document.getElementById('elements');

    var pb = this;

    this.get('./data/model.json', function (data) {

        pb.criteria = data;

        pb.process();
    });
}


PolicyBuilder.prototype.makeEvaluation = function (criteria) {

    var evaluation = document.createElement('div');
    evaluation.className = 'evaluation';

    var sliderId = criteria.label + 'Slider';

    criteria.sliderId = sliderId;

    var sliderValue = criteria.min;

    if (criteria.label === this.criteria[this.COST].label) {
        sliderValue = criteria.max;
    }

    evaluation.innerHTML =

        '<div class="criteria-element">' +
        '<img src = "images/wash/' + criteria.image + '" class = "evaluation-image">' +
        '<label class = "criteria-label">' + criteria.label + '</label>' +
        '<div class="consideration-mobile" id="' + criteria.label + 'MobileConsideration' + '">' + criteria.values[0] + '</div>' +
        '</div>' +
        '<div class="slider-element">' +
        '<label class = "slider-label">' + criteria.values[0] + '</label >' +
        '<input class = "slider" id = "' + sliderId + '" type = "range" min = "' + criteria.min + '"max = "' + criteria.max + '"step = "1" value ="' + sliderValue + '"/>' +
        '<label class = "slider-label">' + criteria.values[criteria.max] + '</label>' + '</div>' +
        '<div class="consideration" id="' + criteria.label + 'Consideration' + '">' + criteria.values[0] + '</div>';

    return evaluation;
}


PolicyBuilder.prototype.radarCalculation = function (policy) {

    var dataValues = [];
    for (var count = this.MINCATEGORY; count < this.MAXCATEGORY; count++) {

        var critRange = this.columns[count].range;
        var policyValue = getPolicyValue(policy, count);

        if (critRange && policyValue)
            dataValues[count] = Math.round((policyValue / critRange.high) * 100);
    }

    return dataValues;
}

PolicyBuilder.prototype.hideRadar = function () {
    var watson = document.getElementById('watson');
    watson.innerHTML = '<img class="glasses" src="images/wash/glasses.svg">View Watson Tradeoffs';
    var radar = document.getElementById('radar');
    radar.style.height = '0';
    radar.style.width = '320px';
    radar.innerHTML = '';
}

PolicyBuilder.prototype.addRadar = function () {

    // Loop through all elements representing the preturned policies
    var datasets = [],
        compareCount = 0,
        dataValues, selectionSet;
    var policies = document.getElementById('policies').children;
    for (var i = 0; i < policies.length; i++) {
        // If the policy is marked for comparison
        if (policies[i].dataset.compare === "Y") {
            // Get policy values and add to the total data set
            dataValues = this.radarCalculation(this.policies[i]);
            selectionSet = {
                label: this.policies[i].name,
                backgroundColor: this.getRadarColors(compareCount, true),
                borderColor: this.getRadarColors(compareCount, false),
                pointBackgroundColor: this.getRadarColors(compareCount, false),
                pointBorderColor: "#fff",
                pointHoverBackgroundColor: "#fff",
                pointHoverBorderColor: this.getRadarColors(compareCount, false),
                data: dataValues,
                fontSize: 12
            };
            datasets.push(selectionSet);
            compareCount++;
        }
    }

    var data = {
        labels: ["Policy Cost", "Level of Care", "Coverage Amount", "Refund Amount", "Reviews"],
        datasets: datasets
    };

    var polar = document.createElement('canvas');
    polar.height = 400;
    polar.width = 400;

    var watson = document.getElementById('watson');
    watson.innerHTML = '<img class="glasses" src="images/wash/glasses.svg">Hide Watson Tradeoffs';

    var radar = document.getElementById('radar');
    radar.style.height = '500px';
    radar.style.width = '500px';
    radar.innerHTML = '';

    radar.appendChild(polar);

    var ctx = polar.getContext("2d");

    Chart.defaults.global.defaultFontColor = '#225282';
    Chart.defaults.global.defaultFontSize = 12;

    var myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: data,
        options: {
            pointLabel: {
                fontSize: 30
            },
            labels: {
                fontSize: 20
            },
            scale: {
                ticks: {
                    beginAtZero: true,
                    max: 100,
                    maxTicksLimit: 5,
                    backdropPaddingX: 5
                }
            }
        }
    })
}

PolicyBuilder.prototype.getRadarColors = function (index, isTransparent) {
    var radarColor = this.radarColors[index % this.radarColors.length],
        alpha = (isTransparent) ? ".3" : 1;
    return "rgba(" + radarColor[0] + "," + radarColor[1] + "," + radarColor[2] + "," + alpha + ")";
}

PolicyBuilder.prototype.sliderChange = function (element) {

    var pb = this;

    pb.criteria.forEach(function (data) {

        if (data.label === element) {
            var slider = document.getElementById(data.label + 'Slider');
            var consideration = document.getElementById(data.label + 'Consideration');
            consideration.innerHTML = data.values[slider.value];
            var mobileconsideration = document.getElementById(data.label + 'MobileConsideration');
            mobileconsideration.innerHTML = data.values[slider.value];
        }
    });

    pb.send();

    if (builder.radarStatus === true) {
        pb.addRadar();
    }
}


PolicyBuilder.prototype.process = function () {

    var instructions = document.getElementById('instructions');
    instructions.innerHTML = 'Adjust your levels';

    var input = document.getElementById('elements');
    input.style.display = 'none';

    var button = document.getElementById('process');
    button.style.display = 'none';

    var filter = document.getElementById('filter');

    var pb = this;

    pb.criteria.forEach(function (criteria) {
        if (criteria.type === 'Mandatory') {
            pb.selectedCriteria.push(criteria.label);
        }
    })

    //    pb.selectedCriteria.forEach(function (criteria) {

    pb.criteria.forEach(function (data) {

        //            if (data.label === criteria) {

        var evaluation = pb.makeEvaluation(data);
        filter.appendChild(evaluation);

        var slider = document.getElementById(data.label + 'Slider');
        slider.addEventListener('change', function () {
            pb.sliderChange(data.label);
        }, false);
        //            }
    });
    //    })
    var output = document.getElementById('results');
    output.style.display = 'flex';

    pb.send();
}


PolicyBuilder.prototype.addStars = function (option) {

    var stars = '<div class="policyRating">';

    var amount = option.review;

    for (count = 0; count < amount; count++) {
        stars = stars + '<img class="starImage" src="images/wash/star.svg">'
    }

    stars = stars + '</div>'
    return stars;
}


PolicyBuilder.prototype.buildFeedback = function (option) {
    var policyFeedback = document.createElement('div');
    policyFeedback.className = 'policyFeedback';
    policyFeedback.id = option.id;
    policyFeedback.dataset.compare = "N";

    var structure =

        '<div class="policyTitle" id="' + option.id + '-title" onclick="togglePolicyComparison(\'' + option.id + '\')">' +
        '<div class="policyName">' + option.name + '</div>' +
        '</div>' +

        '<div class="policyDetails">' +

        '<div class="policyRating">' +
        '<div class="policyDescription">' + option.desc + '</div></div>' +

        '<div class = "policyData" > ' +
        '<label class="policyLabel">Coverage</label><span class="policyContent">$' + option.coverage + '</span>' +
        '</div>' +

        '<div class="policyData">' +
        '<label class="policyLabel">Cost</label><span class="policyContent">$' + option.cost + '</span>' +
        '</div>' +

        '<div class="policyData">' +
        '<label class="policyLabel">Refund</label><span class="policyContent">' + option.cancelRefund + '%</span>' +
        '</div>';

    structure = structure + this.addStars(option);

    structure = structure +

        '</div>' +

        '<div class = "policyAction">' +
        '<div class = "buyPolicy" onclick="orderPolicy(\'' + option.id + '\')"> Buy now </div>' +
        '</div> ';

    policyFeedback.innerHTML = structure;

    // Add option to global policy list
    this.policies.push(option);

    return policyFeedback;
}

PolicyBuilder.prototype.getSliderData = function (element) {

    var value;

    var data = document.getElementById(this.criteria[element].sliderId);

    if (data) {
        value = this.criteria[element].input[data.value];
    }

    return value;
}

/**
 * Builds parameters for sending to the server
 */

PolicyBuilder.prototype.constructPostData = function () {
    var parameters = {};

    pb = this;

    var durationData = pb.getSliderData(pb.DURATION)

    if (durationData !== null) {
        parameters.tripDuration = durationData;
    }

    var costData = pb.getSliderData(pb.COST)
    if (costData !== null) {
        parameters.policyCost = costData;
    }

    var valueData = pb.getSliderData(pb.VALUE)
    if (valueData !== null) {
        parameters.tripCost = valueData;
    }

    var reviewData = pb.getSliderData(pb.REVIEWS)
    if (reviewData !== null) {
        parameters.reviews = reviewData;
    }

    var cancelData = pb.getSliderData(pb.CANCELLATION)
    if (cancelData !== null) {
        parameters.refund = cancelData;
    }

    var peopleData = document.getElementById(this.criteria[this.PEOPLE].sliderId);

    if (peopleData !== null) {

        var count = this.criteria[this.PEOPLE].input[peopleData.value]

        var travelers = [];


        for (var c = 1; c < count; c++) {
            travelers.push(18);
        }

        if (count > 1) {
            parameters.addTravelers = travelers;
        }
    }
    console.log('Data sent to TA:');

    console.log(parameters);

    parameters = JSON.stringify(parameters);

    return parameters;
}


/**
 * Sends the policy parameters to the server
 */

PolicyBuilder.prototype.send = function () {

    var pb = this;

    var anchor = document.getElementById('policies');
    anchor.innerHTML = '';
    anchor.innerHTML = '<img class="loading" src="./images/loading.svg">';

    // Hide the 'View Watson Tradeoffs' button
    if (pb.radarStatus)
        toggleRadar();
    var radarButton = document.getElementById('watson');
    radarButton.style.display = 'none';

    setTimeout(function () {
        xmlhttp = new XMLHttpRequest();
        var url = "/api/tradeoff";
        xmlhttp.open("POST", url, true);
        xmlhttp.setRequestHeader("Content-type", "application/json");
        xmlhttp.onreadystatechange = function () { //Call a function when the state changes.
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

                var data = JSON.parse(xmlhttp.responseText);
                console.log('Data received from TA:');
                console.log(data);

                var anchor = document.getElementById('policies');

                // Reset global vars to be replaced by new results
                pb.columns = data.columns;
                pb.policies = [];

                var options = data.policies;
                anchor.innerHTML = '';
                radarButton.style.display = 'flex';

                options.forEach(function (option) {
                    var element = pb.buildFeedback(option);
                    anchor.appendChild(element);
                })
            }
        }

        var parameters = pb.constructPostData();

        xmlhttp.send(parameters);
    }, 2000);
}

/**
 * A convenience function for http get
 * @param {String} url @param{Function} callback
 */

PolicyBuilder.prototype.get = function (path, callback) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            callback(JSON.parse(xmlhttp.responseText));
        }
    }
    xmlhttp.open("GET", path, true);
    xmlhttp.send();
}


var builder = new PolicyBuilder();

function process() {
    builder.process();
}

function toggleRadar() {

    if (builder.radarStatus === false) {
        builder.addRadar();
        builder.radarStatus = true;
    } else {
        builder.hideRadar();
        builder.radarStatus = false;
    }
}

function updatePolicyElement(el, elTitle, compareToggle, backgroundColor, color) {
    el.dataset.compare = compareToggle;
    elTitle.style.backgroundColor = backgroundColor;
    elTitle.style.color = color;
}

function togglePolicyComparison(policyId) {

    var policy = document.getElementById(policyId),
        policyTitle = document.getElementById(policyId + "-title");
    if (policy.dataset.compare === "N")
        updatePolicyElement(policy, policyTitle, "Y", "#225282", "#ffffff");
    else
        updatePolicyElement(policy, policyTitle, "N", "#8ad3f3", "#225282");

    if (builder.radarStatus === true) {
        builder.addRadar();
    }
}

function getPolicyValue(policy, criteria) {
    var policyValue;
    switch (criteria) {
    case 0:
        policyValue = policy.cost;
        break;
    case 1:
        policyValue = policy.levelCare;
        break;
    case 2:
        policyValue = policy.coverage;
        break;
    case 3:
        policyValue = policy.cancelRefund;
        break;
    case 4:
        policyValue = policy.review;
        break;
    }

    return policyValue;
}

// Create an order for the current customer
function orderPolicy(policyId) {

    // Create order object
    var order = {
        "itemid": policyId,
        "customerid": customerId,
        "count": 1
    };

    // Build AJAX POST request
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/api/orders", true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4)
            policyCreatedResponse(xmlhttp.status, xmlhttp.responseText);
    };
    xmlhttp.send(JSON.stringify(order));
}

var policyCreatedResponse = function (statusCode, response) {
    var alertMessage = "";
    if (statusCode == 200 && JSON.parse(response).msg === "Successfully created item")
        alertMessage = "Policy order placed successfully";
    else
        alertMessage = "There was an error placing your policy order." +
        " Please try again later";
    window.alert(alertMessage);
};

window.onload = builder.addCriteria();