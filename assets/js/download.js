let selectedTab;
const userAgent = navigator.userAgent.toLowerCase();

if (userAgent.includes('macintosh'))
{
    selectedTab = '#tabs-download-mac'
}
else if (userAgent.includes('arm'))
{
    selectedTab = '#tabs-download-arm'
}
else
{
    selectedTab = '#tabs-download-x64';
}

$(selectedTab).tab('show')

const tip = tippy('.previewButton', {
    content: 'Loading...',
    placement:'right',
    arrow:true,
    trigger:'click',
    animation: 'fade',
    allowHTML: true,
    hideOnClick: true,
    interactive: true,
    maxWidth: 'none',
    duration: [200, 0],
    onCreate(instance) {
        instance._isLoaded = false;
      },

    onShow(instance) {

        const buildType = instance.reference.dataset.link;
            
        Promise.allSettled([getLatestBuild(buildType, "")])
        .then((result) => {
            
            var div=`
            <div class="row">
                <div class="col mx-0 mb-4">
                    ${result[0].value}
                </div>
            </div>
            `;
            
            document.getElementById('gammaPreviews').innerHTML = div;
            var content = document.getElementById('previewDownloadTemplate').innerHTML;

            instance.setContent(content);
            instance._isLoaded = true;
            var closeButton = instance.popper.getElementsByClassName('close')[0];
            closeButton.onclick = function() {
                instance.hide();
            }
            
        });
      },
  });

function getTeamcity()
{
    var teamcity = "https://teamcity.vvvv.org";
    
    return teamcity;
}

function getBuildsLink(buildType, branch)
{
    if (branch != "")
    {
        _b = branch;
    }
    else
    {
        _b = '%3Cdefault%3E';
    }

    return getTeamcity() + `/guestAuth/app/rest/builds?locator=branch:name:${_b},buildType:${buildType},status:SUCCESS,state:finished&count=4`;
}

async function getLatestBuild(buildType, branch)
{
    var previews = [];

    var previews = await fetchData(getBuildsLink(buildType, branch));

    var div="<table>";

    if (previews.length > 0)
    {
        for (var preview of previews)
        {
            div +=`<tr>  
                <td><a href="${getTeamcity()}${preview.link}" class="btn btn-secondary previewButton" onclick="plausible('downloadPreview')">${preview.buildNumber}</a></td>
                <td class="date">${preview.date}<br><a href="${preview.changesLink}" target="_blank" class="changes">Changes</a></td>
            </tr>`; 
        }
    }
    else
    {
        div += "<p>No builds available.</p>";
    }

    div+="</table>";

    return div;
}

async function fetchData(link)
{
    var previews = []
    var versionPattern = /\d{4}\.(.*?)\+/;

    var builds = await fetch(link)
    .then(response => response.text())
    .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
    .then(data => {
        return data.getElementsByTagName("build");      
    })

    for (var build of builds) {
        
        var buildNumber = build.getAttribute("number");
        var id = build.getAttribute ("id");
        var href = build.getAttribute ("href");

        if (href != null)
        {
            await fetch(getTeamcity() + href + "/artifacts/children")
            .then(response => response.text())
            .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
            .then(data => {
                var file = data.querySelector('file content[href$=".exe"]');
                var stamp = data.querySelector('file[modificationTime]').getAttribute('modificationTime');           

                if (file != null)
                {
                    var exeLink = file.getAttribute('href');

                    if (exeLink != null)
                    {
                        var shortNumber = buildNumber.match(versionPattern)[1];
                        var changes = getTeamcity()+`/viewLog.html?buildId=${id}&tab=buildChangesDiv&user=guest`;
                        previews.push ({link: exeLink, buildNumber: shortNumber, changesLink: changes, date: getDate(stamp)});
                    }
                }   
            })
        }
    }

    return previews;
}

function getDate(stamp)
{
    var yyyy = stamp.substring(0,4);
    var mm = stamp.substring(4,6);
    var dd = stamp.substring(6,8);
    var H = stamp.substring(9,11);
    var M = stamp.substring(11,13);
                
    return `${dd}.${mm}.${yyyy} ${H}:${M}`;
}


