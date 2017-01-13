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

function register() {
    var firstname = document.getElementById('fname').value;
    var lastname = document.getElementById('lname').value;
    var username = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    var message = document.getElementById('messagearea');
    message.innerHTML = '';

    var xhr = new XMLHttpRequest();

    var uri = 'signup';

    var user = {
        'username': username,
        'password': password,
        'fname': firstname,
        'lname': lastname
    };

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {

        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            console.log("Got response from passport: ", JSON.stringify(response));

            if (response.username) {
                window.location = './login';
            } else {
                message.innerHTML = response.message;
                username = '';
                password = '';
                firstname = '';
                lastname = '';
            }
        } else {
            var response = JSON.parse(xhr.responseText);
            console.error('Server error for passport. Return status of: ', xhr.statusText);
            message.innerHTML = response.message;
        }

        return false;
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
    };

    console.log(JSON.stringify(user));
    xhr.send(JSON.stringify(user));
}

function login() {
    var username = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    var xhr = new XMLHttpRequest();
    var uri = 'login';

    var message = document.getElementById('messagearea');
    message.innerHTML = '';

    var user = {
        'username': username,
        'password': password
    };

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {

        var response = JSON.parse(xhr.responseText);

        if (xhr.status === 200 && xhr.responseText) {

            console.log("Got response from passport: ", JSON.stringify(response));

            if (response.username) {
                window.location = './health';
            } else {
                message.innerHTML = response.message;
                username = '';
                password = '';
            }
        } else {
            message.innerHTML = response.message;
            console.error('Server error for passport. Return status of: ', xhr.statusText);
        }

        return false;
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
    };

    //console.log(JSON.stringify(user));
    xhr.send(JSON.stringify(user));
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
        '<div id="' + policy.title + '-ToggleTextOpen" class="benefitMenu">View Benefit<i style = "padding-left:10px" class="fa fa-angle-down" aria-hidden="true"></i></div>' +
        '<div id="' + policy.title + '-ToggleTextClose" class="benefitMenu" style = "display:none">Close Benefit<i style = "padding-left:10px" class="fa fa-angle-up" aria-hidden="true"></i></div>';
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
    var toggleTextOpen = document.getElementById(id + "-ToggleTextOpen");
    var toggleTextClose = document.getElementById(id + "-ToggleTextClose");

    if (details.style.display !== 'flex') {
        details.style.display = 'flex';
        toggleTextOpen.style.display = 'none';
        toggleTextClose.style.display = 'block';
    } else {
        details.style.display = 'none'
        toggleTextOpen.style.display = 'block';
        toggleTextClose.style.display = 'none';
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

function selectClaimTab() {
    var benefitTab = document.getElementById('benefitset');
    var benefitsTabMenu = document.getElementById('benefitsTabMenu');
    var claimTab = document.getElementById('claimTab');
    var claimTabMenu = document.getElementById('claimTabMenu');

    if (claimTab && benefitTab && claimTabMenu) {
        benefitTab.style.display = 'none';
        claimTab.style.display = 'flex';
        claimTabMenu.className = 'tabLink selected';
        benefitsTabMenu.className = 'tabLink';
    }
}

function selectBenefitsTab() {
    var benefitTab = document.getElementById('benefitset');
    var benefitsTabMenu = document.getElementById('benefitsTabMenu');
    var claimTab = document.getElementById('claimTab');
    var claimTabMenu = document.getElementById('claimTabMenu');

    if (claimTab && benefitTab && claimTabMenu) {
        benefitTab.style.display = 'block';
        claimTab.style.display = 'none';
        claimTabMenu.className = 'tabLink';
        benefitsTabMenu.className = 'tabLink selected';
    }
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
    var login = document.getElementById('login');
    var logout = document.getElementById('logout');
    var askWatson = document.getElementById('askWatson');

    var xhr = new XMLHttpRequest();
    var path = '/isLoggedIn';
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var reply = JSON.parse(xhr.responseText);
            console.log("Reply: ", reply);


            if (reply.outcome === 'success') {
                if (askWatson) {
                    askWatson.style.display = 'inherit';
                }
                if (logout) {
                    login.style.display = 'none';
                }
                if (login) {
                    logout.style.display = 'inherit';
                }
            } else {
                if (askWatson) {
                    askWatson.style.display = 'none';
                }
                if (logout) {
                    logout.style.display = 'none';
                }
                if (login) {
                    login.style.display = 'inherit';
                }
            }
        } else {
            if (login) {
                login.style.display = 'inherit';
            }
            if (logout) {
                logout.style.display = 'none';
            }
            if (askWatson) {
                askWatson.style.display = 'inherit';
            }
        }
    };
    xhr.open("GET", path, true);
    xhr.send();
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