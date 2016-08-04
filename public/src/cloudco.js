/*eslint-env browser */
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
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    var messagearea = document.getElementById('messagearea');
    messagearea.innerHTML = '';

    console.log('email:' + email);

    var xhr = new XMLHttpRequest();

    var uri = 'signup';

    xhr.open('POST', encodeURI(uri));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function (response) {

        var reply = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
            if (reply.outcome === 'success') {
                window.location = './login'
            } else {
                email = '';
                password = '';
                messagearea.innerHTML = 'Something went wrong - try again';
            }
        } else if (xhr.status !== 200) {
            alert('Request failed.  Returned status of ' + xhr.status);
        }
    };
    xhr.send(encodeURI('email=' + email + '&password=' + password));
}

function login() {
    console.log('makeAccount');
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    console.log('email:' + email);

    var xhr = new XMLHttpRequest();

    var uri = 'login';

    var messagearea = document.getElementById('messagearea');
    messagearea.innerHTML = '';

    xhr.open('POST', encodeURI(uri));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function (response) {
        if (xhr.status === 200) {

            console.log('response');
            console.log(xhr.responseText);

            var reply = JSON.parse(xhr.responseText);

            console.log(reply);

            if (reply.outcome === 'success') {
                window.location = './profile'
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
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            callback(JSON.parse(xmlhttp.responseText));
        }
    }
    xmlhttp.open("GET", path, true);
    xmlhttp.send();
}

function getClaims() {

    checkStatus();

    get('./history', function (response) {
        console.log(response)
    })

}


function createBenefitRow(policy) {
    var row = document.createElement('div');
    row.className = 'benefitrow';
    row.innerHTML = '<div class="benefiticon">' +
        '<img class="benefitimage" src="images/health/' + policy.icon + '.svg">' +
        '</div>' +
        '<div class="benefitchannel">' +
        '<div class="benefitmarker"></div>' +
        '</div>' +
        '<div class="benefitTitle">' + policy.title + '</div>';
    row.onclick = function () {
        toggleDetails(policy.title);
    }

    return row;
}

function createBenefitEntity(type) {

    var benefit = document.createElement('div');
    benefit.className = 'benefit';

    benefit.innerHTML = '<div class="sideline">' + type + '</div>' +
        '<div class="benefitblock">' +
        '<div class="benefitcap">' +
        '<div class="benefiticon"></div>' +
        '<div class="benefitchanneltop"></div>' +
        '<div class="benefitTitle"></div>' +
        '</div>' +
        '<div id="' + type + '" class="benefitrows">' +
        '</div>' +

        '<div class="benefitcap">' +
        '<div class="benefiticon"></div>' +
        '<div class="benefitchannelbottom"></div>' +
        '<div class="benefitTitle"></div>' +
        '</div>' +
        '</div>';

    return benefit;
}

function createBenefitDetail(policy) {

    var detail = document.createElement('div');
    detail.className = 'benefitdetail';
    detail.id = policy.title;

    detail.innerHTML = ' <div class="benefiticon">' +
        '<div class="padding"></div>' +
        '</div>' +
        '<div class="benefitdetailchannel">' + '</div>' +
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

function setUpClaimBox(types) {

}

function getBenefits() {

    checkStatus();

    get('./healthBenefits', function (reply) {
        console.log(reply);

        var header = document.getElementById('owner');
        owner.innerHTML = reply.owner;

        var policies = reply.policies;
        var policyAreas = [];
        var policyKeys = [];
        var policyTitles = [];

        var benefitset = document.getElementById('benefitset');

        policies.forEach(function (policy) {

            if (policyAreas[policy.type]) {
                policyAreas[policy.type].push(policy);
            } else {
                policyAreas[policy.type] = [];
                policyAreas[policy.type].push(policy);
                policyKeys.push(policy.type);

                var benefitEntity = createBenefitEntity(policy.type);
                benefitset.appendChild(benefitEntity);
            }

            policyTitles.push(policy.title);

            var anchor = document.getElementById(policy.type);

            var benefitRow = createBenefitRow(policy);
            var benefitDetail = createBenefitDetail(policy);

            anchor.appendChild(benefitRow);
            anchor.appendChild(benefitDetail);
        })

        var uniquebenefits = policyTitles.filter(unique); // returns ['a', 1, 2, '1']

        var select = document.getElementById('benefittypes');

        uniquebenefits.forEach(function (benefit) {
            var option = document.createElement('option');
            option.value = benefit;
            option.innerHTML = benefit;

            select.appendChild(option);
        })

        var datepicker = document.getElementById('claimdate');

        var today = moment().format('YYYY-MM-DD');
        datepicker.value = today;
    })
}

function submitClaim() {

    var dateElement = document.getElementById('claimdate');
    var benefitElement = document.getElementById('benefittypes');
    var providerElement = document.getElementById('provider');
    var amountElement = document.getElementById('claimamount');

    var date = dateElement.value;
    var benefit = benefitElement.value;
    var provider = providerElement.value;
    var amount = amountElement.value;

    var xhr = new XMLHttpRequest();

    var uri = 'claims';

    var claimmessages = document.getElementById('claimmessages');

    xhr.open('POST', encodeURI(uri));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function (response) {

        var reply = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
            if (reply.outcome === 'success') {
                claimmessages.innerHTML = 'Your claim was filed.';
            } else {
                email = '';
                password = '';
                claimmessages.innerHTML = 'Something went wrong - try again';
            }
        } else if (xhr.status !== 200) {
            alert('Request failed.  Returned status of ' + xhr.status);
        }
    };
    xhr.send(encodeURI('date=' + date + '&benefit=' + benefit + '&provider=' + provider + '&amount=' + amount));

    console.log('submit claim');
}

function checkStatus() {

    get('./isLoggedIn', function (reply) {

        var login = document.getElementById('login');
        var logout = document.getElementById('logout');

        if (reply.outcome === 'success') {

            if (login) {
                login.style.display = 'none';
            }
            if (login) {
                logout.style.display = 'inherit';
            }
        } else {
            if (logout) {
                logout.style.display = 'none';
            }
            if (login) {
                login.style.display = 'inherit';
            }
        }
    });
}

checkStatus();