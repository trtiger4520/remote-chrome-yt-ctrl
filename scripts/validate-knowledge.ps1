param(
    [string]$KnowledgeRoot = (Join-Path $PSScriptRoot '../docs/knowledge')
)

$ErrorActionPreference = 'Stop'
$resolvedKnowledgeRoot = (Resolve-Path -LiteralPath $KnowledgeRoot).Path
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $resolvedKnowledgeRoot '../..'))
$errors = [System.Collections.Generic.List[string]]::new()
$markdownFiles = @(Get-ChildItem -LiteralPath $resolvedKnowledgeRoot -Recurse -File -Filter '*.md')

function Get-RelativeKnowledgePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    return [System.IO.Path]::GetRelativePath($resolvedKnowledgeRoot, $Path).Replace('\', '/')
}

function Add-KnowledgeError {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Message
    )

    $errors.Add("${Path}: ${Message}")
}

foreach ($file in $markdownFiles) {
    $relativePath = Get-RelativeKnowledgePath -Path $file.FullName
    $content = Get-Content -LiteralPath $file.FullName -Raw
    $reservedName = $file.Name.ToLowerInvariant()

    if ($reservedName -eq 'index.md') {
        $isRootIndex = $file.DirectoryName -eq $resolvedKnowledgeRoot
        if ($isRootIndex) {
            $rootFrontmatter = [regex]::Match($content, '\A---\r?\n(?<value>.*?)\r?\n---\r?\n', 'Singleline')
            if (-not $rootFrontmatter.Success -or $rootFrontmatter.Groups['value'].Value -notmatch '(?m)^okf_version:\s*["'']?0\.2["'']?\s*$') {
                Add-KnowledgeError -Path $relativePath -Message 'bundle root index must declare okf_version 0.2'
            }
        }
        elseif ($content -match '\A---\r?\n') {
            Add-KnowledgeError -Path $relativePath -Message 'non-root index.md must not contain frontmatter'
        }
    }
    elseif ($reservedName -eq 'log.md') {
        if ($content -match '\A---\r?\n') {
            Add-KnowledgeError -Path $relativePath -Message 'log.md must not contain frontmatter'
        }

        foreach ($heading in [regex]::Matches($content, '(?m)^##\s+(?<value>.+?)\s*$')) {
            if ($heading.Groups['value'].Value -notmatch '^\d{4}-\d{2}-\d{2}$') {
                Add-KnowledgeError -Path $relativePath -Message "log date heading '$($heading.Groups['value'].Value)' must use YYYY-MM-DD"
            }
        }
    }
    else {
        $frontmatter = [regex]::Match($content, '\A---\r?\n(?<value>.*?)\r?\n---\r?\n', 'Singleline')
        if (-not $frontmatter.Success) {
            Add-KnowledgeError -Path $relativePath -Message 'concept must start with YAML frontmatter'
        }
        else {
            $metadata = $frontmatter.Groups['value'].Value
            foreach ($requiredKey in @('type', 'title', 'description', 'status')) {
                if ($metadata -notmatch "(?m)^${requiredKey}:\s*\S.+?\s*$" -and $metadata -notmatch "(?m)^${requiredKey}:\s*\S\s*$") {
                    Add-KnowledgeError -Path $relativePath -Message "frontmatter requires a non-empty ${requiredKey}"
                }
            }

            if ($metadata -notmatch '(?m)^tags:\s*(?:\[[^\]]+\]|\r?\n\s+-\s+\S+)') {
                Add-KnowledgeError -Path $relativePath -Message 'frontmatter requires at least one tag'
            }

            $codePaths = [regex]::Match($metadata, '(?ms)^code_paths:\s*\r?\n(?<items>(?:\s+-\s+.+\r?\n?)+)')
            if ($codePaths.Success) {
                foreach ($codePathItem in [regex]::Matches($codePaths.Groups['items'].Value, '(?m)^\s+-\s+(?<value>.+?)\s*$')) {
                    $codePath = $codePathItem.Groups['value'].Value.Trim().Trim('"', "'")
                    $resolvedCodePath = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $codePath))
                    if (-not (Test-Path -LiteralPath $resolvedCodePath)) {
                        Add-KnowledgeError -Path $relativePath -Message "code_paths target does not exist: ${codePath}"
                    }
                }
            }
        }
    }

    foreach ($link in [regex]::Matches($content, '\[[^\]]+\]\((?<target>[^)]+)\)')) {
        $target = $link.Groups['target'].Value.Trim().Trim('<', '>')
        if ($target -match '^(?:https?:|mailto:|#)') {
            continue
        }

        $pathPart = [Uri]::UnescapeDataString(($target -split '#', 2)[0])
        if ([string]::IsNullOrWhiteSpace($pathPart)) {
            continue
        }

        $resolvedTarget = [System.IO.Path]::GetFullPath((Join-Path $file.DirectoryName $pathPart))
        if (-not (Test-Path -LiteralPath $resolvedTarget)) {
            Add-KnowledgeError -Path $relativePath -Message "local link target does not exist: ${target}"
        }
    }
}

$directories = @($markdownFiles.DirectoryName | Sort-Object -Unique)
foreach ($directory in $directories) {
    $indexPath = Join-Path $directory 'index.md'
    $directoryRelativePath = Get-RelativeKnowledgePath -Path $directory
    if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
        Add-KnowledgeError -Path $directoryRelativePath -Message 'directory containing Markdown requires index.md'
        continue
    }

    $indexContent = Get-Content -LiteralPath $indexPath -Raw
    foreach ($conceptFile in Get-ChildItem -LiteralPath $directory -File -Filter '*.md' | Where-Object Name -ne 'index.md') {
        $escapedName = [regex]::Escape($conceptFile.Name)
        if ($indexContent -notmatch "\]\((?:\./)?${escapedName}(?:#[^)]*)?\)") {
            Add-KnowledgeError -Path (Get-RelativeKnowledgePath -Path $indexPath) -Message "does not list ${($conceptFile.Name)}"
        }
    }

    foreach ($childDirectory in Get-ChildItem -LiteralPath $directory -Directory) {
        $childIndex = Join-Path $childDirectory.FullName 'index.md'
        if (-not (Test-Path -LiteralPath $childIndex -PathType Leaf)) {
            Add-KnowledgeError -Path (Get-RelativeKnowledgePath -Path $childDirectory.FullName) -Message 'child knowledge directory requires index.md'
            continue
        }

        $escapedDirectoryName = [regex]::Escape($childDirectory.Name)
        if ($indexContent -notmatch "\]\((?:\./)?${escapedDirectoryName}(?:/index\.md|/)?(?:#[^)]*)?\)") {
            Add-KnowledgeError -Path (Get-RelativeKnowledgePath -Path $indexPath) -Message "does not link child directory ${($childDirectory.Name)}"
        }
    }
}

if ($errors.Count -gt 0) {
    Write-Host "Knowledge validation failed with $($errors.Count) error(s)"
    foreach ($validationError in $errors) {
        Write-Host "  - $validationError"
    }
    exit 1
}

Write-Host "Knowledge validation passed for $($markdownFiles.Count) Markdown files"
