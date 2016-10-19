/*eslint-env browser */
var fname, lname;

function openTravel() {
    window.location = "travel.html";
}

function openTravelPolicies() {
    window.location = "watson.html";
}

function openHealth() {
    console.log('open health');
}

function makeAccount() {
    console.log('makeAccount');
    var firstname = document.getElementById('fname').value;
    var lastname = document.getElementById('lname').value;
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    var messagearea = document.getElementById('messagearea');
    messagearea.innerHTML = '';

    console.log('email:' + email);

    var xhr = new XMLHttpRequest();

    var uri = 'signup';

    xhr.open('POST', encodeURI(uri));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function(response) {

        var reply = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
            if (reply.outcome === 'success') {
                window.location = './login'
            } else {
                email = '';
                password = '';
                firstname = '';
                lastname = '';
                messagearea.innerHTML = 'Something went wrong - try again';
            }
        } else if (xhr.status !== 200) {
            alert('Request failed.  Returned status of ' + xhr.status);
        }
    };
    xhr.send(encodeURI('email=' + email + '&password=' + password + '&fname=' + firstname + '&lname=' + lastname));
}

function login() {
    console.log('login');
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    console.log('email:' + email);

    var xhr = new XMLHttpRequest();

    var uri = 'login';

    var messagearea = document.getElementById('messagearea');
    messagearea.innerHTML = '';

    xhr.open('POST', encodeURI(uri));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function(response) {
        if (xhr.status === 200) {

            console.log('response');
            console.log(xhr.responseText);

            var reply = JSON.parse(xhr.responseText);

            console.log(reply);

            if (reply.outcome === 'success') {
                window.location = './health'
            } else {
                messagearea.innerHTML = 'Something went wrong - try again';
            }


        } else if (xhr.status !== 200) {
            alert('Request failed.  Returned status of ' + xhr.status);
        }
    };
    xhr.send(encodeURI('email=' + email + '&password=' + password));
}


function get(path, callback) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            callback(JSON.parse(xmlhttp.responseText));
        }
    }
    xmlhttp.open("GET", path, true);
    xmlhttp.send();
}


function makeHistoryRow(claim) {

    var date = moment(claim.date).format('YYYY-MM-DD');

    var row = document.createElement('div');
    row.className = 'claimrow';
    row.innerHTML = '<div class="marker">' +
        '<img class="claimimage" src="images/health/' + claim.icon + '.svg">' +
        '</div>' +
        '<div class="claimdata">' + claim.policy + '</div>' +
        '<div class="claimdata">' + claim.provider + '</div>' +
        '<div class="centereddata">' + date + '</div>' +
        '<div class="centereddata">' + claim.outcome + '</div>' +
        '<div class="financeclaimdata">$' + claim.amount + '</div>' +
        '<div class="financeclaimdata">$' + claim.payment + '</div>';

    return row;
}

function getClaims() {

    checkStatus();

    get('./history', function(reply) {
        console.log(reply);

        var header = document.getElementById('owner');
        owner.innerHTML = reply.owner;

        var claimlist = document.getElementById('claimlist');

        reply.claims.forEach(function(claim) {
            var row = makeHistoryRow(claim);
            claimlist.appendChild(row);
        });
    })
}


function createBenefitRow(policy) {
    var row = document.createElement('div');
    row.className = 'benefitrow';
    row.innerHTML = '<div class="benefiticon">' +
        '<img class="benefitimage" src="images/health/' + policy.icon + '.svg">' +
        '</div>' +
        '</div>' +
        '<div class="benefitTitle">' + policy.title + '</div>' +
        '<div class="benefitMenu">View Benefit</div>';
    row.onclick = function() {
        toggleDetails(policy.title);
    }

    return row;
}

function createBenefitEntity(type) {

    var benefit = document.createElement('div');
    benefit.className = 'benefit';

    benefit.innerHTML = '<div class="benefitblock">' +
        '<div class="benefitcap">' +
        '<div class="benefiticon"></div>' +

        '<div class="benefitTitle"></div>' +
        '</div>' +
        '<div id="' + type + '" class="benefitrows">' +
        '</div>' +

        '<div class="benefitcap">' +
        '<div class="benefiticon"></div>' +
        '<div class="benefitTitle"></div>' +
        '</div>' +
        '</div>';

    return benefit;
}

function createBenefitDetail(policy) {

    var detail = document.createElement('div');
    detail.className = 'benefitdetail';
    detail.id = policy.title;

    detail.innerHTML =
        '<div class="benefitfacts">' +
        '<div class="benefitfact">' +
        '<div class="factlabel">benefit</div>' +
        '<div class="factcheck">' + policy.description + '</div>' +
        '</div>' +
        '<div class="benefitfact">' +
        '<div class="factlabel">limit</div>' +
        '<div class="factcheck">$' + policy.claimLimit + '</div>' +
        '</div>' +
        '<div class="benefitfact">' +
        '<div class="factlabel">coverage</div>' +
        '<div class="factcheck">' + policy.percentCovered + '%</div>' +
        '</div>' +
        '<div class="benefitfact">' +
        '<div class="factlabel">term</div>' +
        '<div class="factcheck">' + policy.scope + '</div>' +
        '</div>' +
        '<div class="benefitfact">' +
        '<div class="factlabel">start</div>' +
        '<div class="factcheck">Jan 1 2016</div>' +
        '</div>' +
        '<div class="benefitfact">' +
        '<div class="factlabel">end</div>' +
        '<div class="factcheck">Dec 31 2017</div>' +
        '</div>' +
        '<div class="benefitfact">' +
        '<div class="factlabel">code</div>' +
        '<div class="factcheck">' + policy.code + '</div>' +
        '</div>' +
        '</div>'

    return detail;
}


function toggleDetails(id) {
    var details = document.getElementById(id);

    if (details.style.display !== 'flex') {
        details.style.display = 'flex';
    } else {
        details.style.display = 'none'
    }

}

function unique(value, index, self) {
    return self.indexOf(value) === index;
}


function getBenefits() {

    checkStatus();

    get('./healthBenefits', function(reply) {

        var header = document.getElementById('owner');

        if (fname) {
            header.innerHTML = fname + ' ' + lname + ' - ' + reply.owner;
        } else {
            header.innerHTML = reply.owner;
        }

        var policies = reply.policies;
        var policyAreas = [];
        var policyKeys = [];
        var policyTitles = [];

        var benefitset = document.getElementById('benefitset');

        policies.forEach(function(policy) {

            if (policyAreas[policy.type]) {
                policyAreas[policy.type].push(policy);
            } else {
                policyAreas[policy.type] = [];
                policyAreas[policy.type].push(policy);
                policyKeys.push(policy.type);
                var benefitTitle = document.createElement('div');
                benefitTitle.className = "benefitTypeTitle";
                benefitTitle.innerHTML = policy.type + " Benefits";
                var benefitEntity = createBenefitEntity(policy.type);
                benefitset.appendChild(benefitTitle);
                benefitset.appendChild(benefitEntity);

            }

            policyTitles.push(policy.title);

            var anchor = document.getElementById(policy.type);

            var benefitRow = createBenefitRow(policy);
            var benefitDetail = createBenefitDetail(policy);

            anchor.appendChild(benefitRow);
            anchor.appendChild(benefitDetail);
        });

        var uniquebenefits = policyTitles.filter(unique); // returns ['a', 1, 2, '1']

        var select = document.getElementById('benefittypes');

        uniquebenefits.forEach(function(benefit) {
            var option = document.createElement('option');
            option.value = benefit;
            option.innerHTML = benefit;

            select.appendChild(option);
        });

        var datepicker = document.getElementById('claimdate');

        var today = moment().format('YYYY-MM-DD');
        datepicker.value = today;

        // Load Ana's first message after the user info
        userMessage('');
    })
}

function submitClaim(source) {

    var claimFile = {
        date: null,
        benefit: null,
        provider: null,
        amount: null
    };

    var dateElement = document.getElementById('claimdate');
    var benefitElement = document.getElementById('benefittypes');
    var providerElement = document.getElementById('provider');
    var amountElement = document.getElementById('claimamount');

    claimFile.date = dateElement.value;
    claimFile.benefit = benefitElement.value;
    claimFile.provider = providerElement.value;
    claimFile.amount = amountElement.value;

    var xhr = new XMLHttpRequest();

    var uri = '/submitClaim';

    var claimmessages = document.getElementById('claimmessages');

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function(response) {
        if (xhr.status === 200 && xhr.responseText) {
            var reply = JSON.parse(xhr.responseText);

            if (reply.outcome === 'success') {
                claimmessages.innerHTML = 'Your claim was filed.';
            } else {
                email = '';
                password = '';
                claimmessages.innerHTML = 'Something went wrong - try again';

            }
        } else {
            alert('Request failed.  Returned status of ' + xhr.status);
        }
    };

    console.log("Submitting claim: ", JSON.stringify(claimFile));
    xhr.send(JSON.stringify(claimFile));
}

function checkStatus() {

    get('./isLoggedIn', function(reply) {

        var login = document.getElementById('login');
        var logout = document.getElementById('logout');
        var askWatson = document.getElementById('askWatson');

        if (reply.fname) {
            fname = reply.fname;
            lname = reply.lname;
        }

        if (reply.outcome === 'success') {
            if(askWatson) {
              askWatson.style.display = 'inherit';
            }
            if (logout) {
                login.style.display = 'none';
            }
            if (login) {
                logout.style.display = 'inherit';
            }
        } else {
            askWatson.style.display = 'none';
            if (logout) {
                logout.style.display = 'none';
            }
            if (login) {
                login.style.display = 'inherit';
            }
        }
    });
}

// Enter is pressed
function newEvent(e, target) {
    if (e.which === 13 || e.keyCode === 13) {

        if (target === "login") {
            login();
        }
    }
}

checkStatus();
