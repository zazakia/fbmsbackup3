#!/bin/bash

# Intelligent Commit Message Generator for FBMS
# This script analyzes git changes and generates meaningful commit messages

# Generate commit message based on git changes
generate_commit_message() {
    local custom_message="$1"
    local commit_type="$2"  # "auto", "feature", "fix", "update", "release"
    
    # If custom message provided, use it
    if [ -n "$custom_message" ]; then
        echo "$custom_message"
        return 0
    fi
    
    # Analyze changes to generate intelligent commit message
    local added_files=$(git diff --cached --name-only --diff-filter=A 2>/dev/null | wc -l)
    local modified_files=$(git diff --cached --name-only --diff-filter=M 2>/dev/null | wc -l)
    local deleted_files=$(git diff --cached --name-only --diff-filter=D 2>/dev/null | wc -l)
    local renamed_files=$(git diff --cached --name-only --diff-filter=R 2>/dev/null | wc -l)
    
    # If no staged changes, check unstaged changes
    if [ $((added_files + modified_files + deleted_files + renamed_files)) -eq 0 ]; then
        added_files=$(git diff --name-only --diff-filter=A 2>/dev/null | wc -l)
        modified_files=$(git diff --name-only --diff-filter=M 2>/dev/null | wc -l)
        deleted_files=$(git diff --name-only --diff-filter=D 2>/dev/null | wc -l)
        renamed_files=$(git diff --name-only --diff-filter=R 2>/dev/null | wc -l)
    fi
    
    # Get changed files for content analysis
    local changed_files=""
    if git diff --cached --name-only &>/dev/null; then
        changed_files=$(git diff --cached --name-only 2>/dev/null)
    else
        changed_files=$(git diff --name-only 2>/dev/null)
    fi
    
    # Analyze file types and generate appropriate message
    local message=""
    local has_components=false
    local has_api=false
    local has_config=false
    local has_docs=false
    local has_tests=false
    local has_styles=false
    local has_scripts=false
    local has_types=false
    local has_security=false
    
    # Check file types
    while IFS= read -r file; do
        case "$file" in
            *components*|*Components*) has_components=true ;;
            *api*|*API*|*services*) has_api=true ;;
            *config*|*Config*|*.json|*.yml|*.yaml|*.toml) has_config=true ;;
            *README*|*docs*|*documentation*|*.md) has_docs=true ;;
            *test*|*Test*|*__tests__*|*.test.*|*.spec.*) has_tests=true ;;
            *styles*|*css*|*scss*|*sass*|*.css|*.scss|*.sass) has_styles=true ;;
            *scripts*|*script*|*.sh|*.js|*.ts) has_scripts=true ;;
            *types*|*Types*|*.d.ts|*interfaces*) has_types=true ;;
            *security*|*Security*|*auth*|*Auth*|*permission*) has_security=true ;;
        esac
    done <<< "$changed_files"
    
    # Generate message based on analysis
    case "$commit_type" in
        "feature")
            message="feat: add new feature"
            ;;
        "fix")
            message="fix: resolve issue"
            ;;
        "update")
            message="update: improve existing functionality"
            ;;
        "release")
            message="release: version $(date +'%Y.%m.%d')"
            ;;
        "auto"|*)
            # Auto-generate based on changes
            if [ "$added_files" -gt 0 ] && [ "$modified_files" -eq 0 ] && [ "$deleted_files" -eq 0 ]; then
                # Only additions
                if [ "$added_files" -eq 1 ]; then
                    message="feat: add new file"
                else
                    message="feat: add $added_files new files"
                fi
            elif [ "$added_files" -eq 0 ] && [ "$modified_files" -gt 0 ] && [ "$deleted_files" -eq 0 ]; then
                # Only modifications
                if [ "$modified_files" -eq 1 ]; then
                    message="update: modify existing file"
                else
                    message="update: modify $modified_files files"
                fi
            elif [ "$added_files" -eq 0 ] && [ "$modified_files" -eq 0 ] && [ "$deleted_files" -gt 0 ]; then
                # Only deletions
                if [ "$deleted_files" -eq 1 ]; then
                    message="remove: delete file"
                else
                    message="remove: delete $deleted_files files"
                fi
            else
                # Mixed changes - be more specific
                message="update: "
                local parts=()
                
                # Add specific context based on file types
                if [ "$has_components" = true ]; then
                    parts+=("update components")
                fi
                if [ "$has_api" = true ]; then
                    parts+=("enhance API")
                fi
                if [ "$has_config" = true ]; then
                    parts+=("update configuration")
                fi
                if [ "$has_docs" = true ]; then
                    parts+=("update documentation")
                fi
                if [ "$has_tests" = true ]; then
                    parts+=("improve tests")
                fi
                if [ "$has_styles" = true ]; then
                    parts+=("update styles")
                fi
                if [ "$has_scripts" = true ]; then
                    parts+=("enhance scripts")
                fi
                if [ "$has_types" = true ]; then
                    parts+=("update types")
                fi
                if [ "$has_security" = true ]; then
                    parts+=("enhance security")
                fi
                
                # If no specific context, use generic message
                if [ ${#parts[@]} -eq 0 ]; then
                    if [ "$added_files" -gt 0 ] && [ "$modified_files" -gt 0 ]; then
                        message="feat: add and update multiple files"
                    elif [ "$added_files" -gt 0 ]; then
                        message="feat: add $added_files new files"
                    elif [ "$modified_files" -gt 0 ]; then
                        message="update: modify $modified_files files"
                    else
                        message="update: make various changes"
                    fi
                else
                    # Join parts with "and"
                    if [ ${#parts[@]} -eq 1 ]; then
                        message="$message${parts[0]}"
                    elif [ ${#parts[@]} -eq 2 ]; then
                        message="$message${parts[0]} and ${parts[1]}"
                    else
                        local last_part="${parts[${#parts[@]}-1]}"
                        unset parts[${#parts[@]}-1]
                        message="$message$(IFS=', '; echo "${parts[*]}"), and $last_part"
                    fi
                fi
            fi
            ;;
    esac
    
    # Add change summary
    local summary=""
    if [ "$added_files" -gt 0 ] || [ "$modified_files" -gt 0 ] || [ "$deleted_files" -gt 0 ]; then
        summary=" ("
        local change_parts=()
        
        [ "$added_files" -gt 0 ] && change_parts+=("+$added_files")
        [ "$modified_files" -gt 0 ] && change_parts+=("~$modified_files")
        [ "$deleted_files" -gt 0 ] && change_parts+=("-$deleted_files")
        
        summary="$summary$(IFS=' '; echo "${change_parts[*]}")"
        summary="$summary files)"
    fi
    
    echo "$message$summary"
}

# Generate commit message with AI-like intelligence
generate_smart_commit_message() {
    local branch_name=$(git branch --show-current 2>/dev/null)
    local custom_message="$1"
    
    # If custom message provided, use it
    if [ -n "$custom_message" ]; then
        echo "$custom_message"
        return 0
    fi
    
    # Get the most recent commit to understand the pattern
    local last_commit=$(git log -1 --pretty=format:"%s" 2>/dev/null)
    
    # Analyze branch name for context
    local commit_prefix=""
    case "$branch_name" in
        feature/*|feat/*)
            commit_prefix="feat"
            ;;
        fix/*|bugfix/*|hotfix/*)
            commit_prefix="fix"
            ;;
        update/*|improve/*|enhance/*)
            commit_prefix="update"
            ;;
        docs/*|documentation/*)
            commit_prefix="docs"
            ;;
        style/*|styles/*|css/*)
            commit_prefix="style"
            ;;
        test/*|tests/*|testing/*)
            commit_prefix="test"
            ;;
        security/*|sec/*)
            commit_prefix="security"
            ;;
        v[0-9]*|release/*|rel/*)
            commit_prefix="release"
            ;;
        *)
            commit_prefix="update"
            ;;
    esac
    
    # Get changed files for analysis
    local changed_files=""
    if git diff --cached --name-only &>/dev/null && [ -n "$(git diff --cached --name-only)" ]; then
        changed_files=$(git diff --cached --name-only 2>/dev/null)
    else
        changed_files=$(git diff --name-only 2>/dev/null)
    fi
    
    # Analyze specific files for more context
    local context_parts=()
    local main_area=""
    
    while IFS= read -r file; do
        case "$file" in
            src/components/*)
                [ "$main_area" != "components" ] && context_parts+=("components") && main_area="components"
                ;;
            src/api/*)
                [ "$main_area" != "api" ] && context_parts+=("API") && main_area="api"
                ;;
            src/store/*)
                [ "$main_area" != "store" ] && context_parts+=("store") && main_area="store"
                ;;
            src/utils/*)
                [ "$main_area" != "utils" ] && context_parts+=("utilities") && main_area="utils"
                ;;
            src/types/*)
                [ "$main_area" != "types" ] && context_parts+=("types") && main_area="types"
                ;;
            src/services/*)
                [ "$main_area" != "services" ] && context_parts+=("services") && main_area="services"
                ;;
            scripts/*)
                [ "$main_area" != "scripts" ] && context_parts+=("scripts") && main_area="scripts"
                ;;
            *test*|*spec*)
                [ "$main_area" != "tests" ] && context_parts+=("tests") && main_area="tests"
                ;;
            *.md|*README*|docs/*)
                [ "$main_area" != "docs" ] && context_parts+=("documentation") && main_area="docs"
                ;;
            *.json|*.yml|*.yaml|*.toml|*config*)
                [ "$main_area" != "config" ] && context_parts+=("configuration") && main_area="config"
                ;;
            *.css|*.scss|*.sass|*styles*)
                [ "$main_area" != "styles" ] && context_parts+=("styles") && main_area="styles"
                ;;
        esac
    done <<< "$changed_files"
    
    # Generate intelligent commit message
    local message="$commit_prefix: "
    local action_verb=""
    
    # Choose appropriate action verb based on prefix
    case "$commit_prefix" in
        "feat")
            action_verb="add"
            ;;
        "fix")
            action_verb="fix"
            ;;
        "update")
            action_verb="update"
            ;;
        "docs")
            action_verb="update"
            ;;
        "style")
            action_verb="improve"
            ;;
        "test")
            action_verb="add"
            ;;
        "security")
            action_verb="enhance"
            ;;
        "release")
            action_verb="release"
            ;;
        *)
            action_verb="update"
            ;;
    esac
    
    # Build context-aware message
    if [ ${#context_parts[@]} -eq 0 ]; then
        # No specific context, use generic message
        case "$commit_prefix" in
            "release")
                message="$message version $(date +'%Y.%m.%d')"
                ;;
            *)
                message="$message $action_verb project files"
                ;;
        esac
    elif [ ${#context_parts[@]} -eq 1 ]; then
        # Single context area
        case "$commit_prefix" in
            "release")
                message="$message version $(date +'%Y.%m.%d')"
                ;;
            *)
                message="$message $action_verb ${context_parts[0]}"
                ;;
        esac
    else
        # Multiple context areas
        case "$commit_prefix" in
            "release")
                message="$message version $(date +'%Y.%m.%d')"
                ;;
            *)
                if [ ${#context_parts[@]} -eq 2 ]; then
                    message="$message $action_verb ${context_parts[0]} and ${context_parts[1]}"
                else
                    local last_part="${context_parts[${#context_parts[@]}-1]}"
                    unset context_parts[${#context_parts[@]}-1]
                    message="$message $action_verb $(IFS=', '; echo "${context_parts[*]}"), and $last_part"
                fi
                ;;
        esac
    fi
    
    # Add timestamp for uniqueness
    local timestamp=$(date +'%H:%M')
    message="$message [$timestamp]"
    
    echo "$message"
}

# Export functions
export -f generate_commit_message generate_smart_commit_message