# Build PowerPoint presentation from Presentation1.pptx template with guaranteed OPC forward-slash paths
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$templatePath = "presentation\Presentation1.pptx"
$outputPath = "presentation\WebViewer_Modular_UI_Builder.pptx"
$tempDir = Join-Path $env:TEMP ("pptx_template_" + [Guid]::NewGuid().ToString("N"))

if (-not (Test-Path $templatePath)) {
    Write-Error "Template file not found: $templatePath"
    exit 1
}

# 1. Extract Presentation1.pptx cleanly
[System.IO.Compression.ZipFile]::ExtractToDirectory($templatePath, $tempDir)

function Write-Utf8File($path, $content) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Read-Utf8File($path) {
    return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

# 2. Slide 1 (Title slide - uses slideLayout1.xml)
$slide1Xml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="ctrTitle"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" b="1" sz="3800"/>
              <a:t>Dogfooding Modular UI</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Subtitle 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="subTitle" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="2000" b="1"/>
              <a:t>Lessons from Building a Visual Studio Prototype</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr><a:spcBfr><a:spcPts val="1200"/></a:spcBfr></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1500"/>
              <a:t>Presenter: Luke (Support Team)   |   Status: Early Internal Prototype (Not Customer-Facing)</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
"@
Write-Utf8File (Join-Path $tempDir "ppt\slides\slide1.xml") $slide1Xml

# 3. Slides 2-7 Data (Title & Content - uses slideLayout2.xml)
$contentSlides = @(
    @{
        Num = 2
        Title = "The Support Reality: The Modular UI Bottleneck"
        Bullets = @(
            "Modular UI is powerful, but hand-crafting deeply nested JSON configs has a steep learning curve",
            "Common customer tickets: 'Why did my ribbon tab vanish?', 'How do I add custom stamps or buttons?'",
            "Support engineers spent hours manually hand-writing JSON trees and guessing property names for tickets",
            "The Goal: An internal visual studio to assemble, validate, and export clean Modular UI JSON in seconds"
        )
    },
    @{
        Num = 3
        Title = "Visual Studio Architecture & Core Capabilities"
        Bullets = @(
            "UI Outline Tree: Visual hierarchy of Headers, Ribbon Tabs, Groups, Tools, Flyouts, Panels, and Popups",
            "Component Library: Drag & stage built-in WebViewer tool presets and custom action buttons",
            "Live WebViewer Canvas: Embedded WebViewer SDK (v12.2) with hot dynamic re-rendering (auto-apply)",
            "Bi-directional DOM Highlighting: Selecting tree nodes visibly pulses elements in the live viewer iframe"
        )
    },
    @{
        Num = 4
        Title = "Live Demonstration & Scenarios"
        Bullets = @(
            "[LIVE DEMO ACTION: Switch to browser at http://localhost:5173]",
            "Scenario A (Header & Ribbon): Target Annotate tab -> stage tool from library -> commit -> instant live update",
            "Modular Permissiveness: Seamlessly support duplicate tools across headers and popups without conflicts",
            "Scenario B (Inspect & Export): Click tool in tree -> observe DOM pulse -> click 'View JSON' / 'Copy JSON'",
            "Ready-to-paste schema object solved and exported to ticket in under 2 minutes"
        )
    },
    @{
        Num = 5
        Title = "Technical Insights & SDK Observations"
        Bullets = @(
            "Dynamic Container Reconciliation: Hot-reloading headers requires reconciliation of active tool containers so listeners don't orphan",
            "Modular Permissiveness: Decoupling dataElements prevents SDK state collisions when duplicate buttons are used",
            "Automated Smoke Testbed: The studio exercises edge cases daily and acts as an early smoke test for new SDK releases"
        )
    },
    @{
        Num = 6
        Title = "Status & Open Questions for the Authors"
        Bullets = @(
            "Current Status: Early internal Support prototype (not customer-facing yet)",
            "Opportunity: Could this visual builder evolve into an official developer tool on our docs portal?",
            "Schema Ingestion: Can we feed official JSON schemas directly from the core WebViewer SDK package?",
            "Cross-Team Partnership: How can Support and Core Engineering collaborate to catch Modular UI friction earlier?"
        )
    },
    @{
        Num = 7
        Title = "Questions & Feedback from Engineering"
        Bullets = @(
            "Repository: WebViewer UI Builder (React + Vite + WebViewer 12.2)",
            "Run locally: npm run dev (opens http://localhost:5173)",
            "Core files: src/ModularUIBuilder.jsx, src/components/studio/",
            "Open floor for architectural suggestions, critique, and feedback!"
        )
    }
)

foreach ($s in $contentSlides) {
    $num = $s.Num
    $title = [System.Security.SecurityElement]::Escape($s.Title)
    
    $bulletsXml = ""
    foreach ($b in $s.Bullets) {
        $escaped = [System.Security.SecurityElement]::Escape($b)
        $bulletsXml += @"
          <a:p>
            <a:pPr lvl="0"><a:spcBfr><a:spcPts val="1200"/></a:spcBfr></a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1700"/>
              <a:t>$escaped</a:t>
            </a:r>
          </a:p>
"@
    }

    $slideXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" b="1" sz="2800"/>
              <a:t>$title</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content Placeholder 2"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          $bulletsXml
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
"@
    Write-Utf8File (Join-Path $tempDir "ppt\slides\slide$num.xml") $slideXml

    # Relationship to slideLayout2.xml
    $slideRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/>
</Relationships>
"@
    Write-Utf8File (Join-Path $tempDir "ppt\slides\_rels\slide$num.xml.rels") $slideRels
}

# 4. Update [Content_Types].xml
$contentTypesPath = Join-Path $tempDir "[Content_Types].xml"
$ctXml = Read-Utf8File $contentTypesPath
for ($i = 2; $i -le 7; $i++) {
    $override = "<Override PartName=`"/ppt/slides/slide$i.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.presentationml.slide+xml`"/>"
    if ($ctXml -notmatch "/ppt/slides/slide$i.xml") {
        $ctXml = $ctXml.Replace("</Types>", "$override</Types>")
    }
}
Write-Utf8File $contentTypesPath $ctXml

# 5. Update ppt/_rels/presentation.xml.rels
$presRelsPath = Join-Path $tempDir "ppt\_rels\presentation.xml.rels"
$presRelsXml = Read-Utf8File $presRelsPath
for ($i = 2; $i -le 7; $i++) {
    $rId = "rId" + ($i + 5) # rId7 to rId12
    $relTag = "<Relationship Id=`"$rId`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide`" Target=`"slides/slide$i.xml`"/>"
    if ($presRelsXml -notmatch "slides/slide$i.xml") {
        $presRelsXml = $presRelsXml.Replace("</Relationships>", "$relTag</Relationships>")
    }
}
Write-Utf8File $presRelsPath $presRelsXml

# 6. Update ppt/presentation.xml
$presPath = Join-Path $tempDir "ppt\presentation.xml"
$presXml = Read-Utf8File $presPath
$sldIdLst = "<p:sldIdLst><p:sldId id=`"256`" r:id=`"rId2`"/>"
for ($i = 2; $i -le 7; $i++) {
    $id = 255 + $i
    $rId = "rId" + ($i + 5)
    $sldIdLst += "<p:sldId id=`"$id`" r:id=`"$rId`"/>"
}
$sldIdLst += "</p:sldIdLst>"

$presXml = [System.Text.RegularExpressions.Regex]::Replace($presXml, "<p:sldIdLst>.*?</p:sldIdLst>", $sldIdLst)
Write-Utf8File $presPath $presXml

# 7. Update docProps/app.xml
$appPath = Join-Path $tempDir "docProps\app.xml"
$appXml = Read-Utf8File $appPath
$appXml = [System.Text.RegularExpressions.Regex]::Replace($appXml, "<Slides>\d+</Slides>", "<Slides>7</Slides>")
Write-Utf8File $appPath $appXml

# 8. Cleanly create ZIP with FORWARD SLASHES for every single entry
if (Test-Path $outputPath) { Remove-Item -Force $outputPath }
$zipFile = [System.IO.Compression.ZipFile]::Open($outputPath, [System.IO.Compression.ZipArchiveMode]::Create)

$allFiles = Get-ChildItem -Recurse -File $tempDir
foreach ($file in $allFiles) {
    $rel = $file.FullName.Substring($tempDir.Length).TrimStart('\', '/')
    $entryName = $rel.Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipFile, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal)
}

$zipFile.Dispose()
Remove-Item -Recurse -Force $tempDir

Write-Output "Successfully updated: $outputPath"
