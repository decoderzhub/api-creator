# Regenerate Button Feature

## Overview

Added a "Regenerate" button to the Dynamic Test UI that allows users to:
- Retry generating the custom test interface if it failed
- Refresh the UI after configuring the Anthropic API key
- Generate a new variation of the test interface
- Recover from transient errors

## Visual States

### 1. Error State (Yellow Warning Card)

```
┌────────────────────────────────────────────────────────────┐
│ ⚠️  Custom test interface unavailable                      │
│                                                            │
│    HTTP 500: Failed to generate test UI                   │
│                                                            │
│    Note: Dynamic test UI requires ANTHROPIC_API_KEY        │
│    to be configured on the server.                        │
│                                                            │
│    Use the "Test Endpoint" buttons above or test via      │
│    curl/Postman.                                           │
│                                                            │
│    [🔄 Try Again]  Retry after configuring API key        │
└────────────────────────────────────────────────────────────┘
```

### 2. Success State (With Regenerate Option)

```
┌────────────────────────────────────────────────────────────┐
│ 🟢 Custom test interface loaded     [🔄 Regenerate]       │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │  [Custom React Component Rendered Here]               │ │
│ │                                                        │ │
│ │  - File upload with drag-and-drop                     │ │
│ │  - Parameter inputs                                   │ │
│ │  - Test button                                        │ │
│ │  - Response display                                   │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 3. Loading State (During Regeneration)

```
┌────────────────────────────────────────────────────────────┐
│ ⏳  Generating custom test interface...                    │
└────────────────────────────────────────────────────────────┘
```

## Features

### 1. Try Again Button (Error State)

**Location:** Bottom of error card
**Style:** Yellow outlined button matching warning theme
**Text:** "Try Again" with refresh icon
**Behavior:**
- Disabled when already loading
- Shows "Regenerating..." during reload
- Helpful tooltip: "Retry after configuring API key" or "Generate a new test interface"

### 2. Regenerate Button (Success State)

**Location:** Top-right corner of test interface
**Style:** Ghost button, subtle and unobtrusive
**Text:** "Regenerate" with refresh icon
**Behavior:**
- Small, doesn't distract from main content
- Icon spins during regeneration
- Preserves existing component until new one loads

### 3. Status Indicator

**Success:**
- Green pulsing dot
- "Custom test interface loaded"

**Loading:**
- Spinning loader
- "Generating custom test interface..."

**Error:**
- Yellow warning icon
- Detailed error message

## Use Cases

### Use Case 1: API Key Not Configured

**Scenario:** User sees error because ANTHROPIC_API_KEY is missing

**Steps:**
1. User sees yellow warning card
2. User adds API key to backend `.env` file
3. User restarts backend server
4. User clicks "Try Again" button
5. System regenerates successfully
6. Custom test UI appears

### Use Case 2: Transient Network Error

**Scenario:** Generation failed due to temporary network issue

**Steps:**
1. User sees error message
2. User clicks "Try Again"
3. System retries API call
4. Generation succeeds
5. Custom test UI loads

### Use Case 3: Want Fresh UI

**Scenario:** User wants to see if AI generates different/better UI

**Steps:**
1. User has working test UI
2. User clicks "Regenerate" button (top-right)
3. Existing UI remains visible while generating
4. New UI replaces old one when ready
5. User can compare/use new version

### Use Case 4: Code Updated

**Scenario:** User modified their API code and wants updated test UI

**Steps:**
1. User edits API code in backend
2. User saves changes
3. User clicks "Regenerate" in dashboard
4. System generates UI based on new code
5. Test UI reflects new endpoints/parameters

## Technical Implementation

### State Management

```typescript
const [componentCode, setComponentCode] = useState<string>('');
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string>('');
const [regenerateKey, setRegenerateKey] = useState(0);
```

### Fetch Function

```typescript
const fetchTestUI = useCallback(async () => {
  try {
    setLoading(true);
    setError('');

    const response = await fetch('/api/generate-test-ui', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, apiName, apiId, endpointUrl }),
    });

    if (!response.ok) throw new Error('Failed to generate');

    const data = await response.json();
    setComponentCode(data.componentCode);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [apiId, code, apiName, apiUrl]);
```

### Regenerate Handler

```typescript
const handleRegenerate = () => {
  setRegenerateKey(prev => prev + 1); // Force React re-render
  fetchTestUI();
};
```

### Button Implementation

```typescript
<Button
  size="sm"
  variant="outline"
  onClick={handleRegenerate}
  disabled={loading}
>
  {loading ? (
    <>
      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
      Regenerating...
    </>
  ) : (
    <>
      <RefreshCw className="w-3 h-3 mr-2" />
      Try Again
    </>
  )}
</Button>
```

## Benefits

### 1. User Experience
- ✅ No page refresh required
- ✅ Clear path to recovery from errors
- ✅ Ability to experiment with different UI variations
- ✅ Visual feedback during regeneration

### 2. Developer Experience
- ✅ Easy to test after configuration changes
- ✅ Quick iteration on AI prompts
- ✅ Self-service troubleshooting
- ✅ No need for manual page reloads

### 3. Reliability
- ✅ Handles transient failures gracefully
- ✅ User can retry without technical knowledge
- ✅ Clear error messages with actionable steps
- ✅ Maintains existing UI during regeneration

## Future Enhancements

### 1. Regeneration History
```typescript
interface RegenerationHistory {
  timestamp: Date;
  componentCode: string;
  success: boolean;
}

const [history, setHistory] = useState<RegenerationHistory[]>([]);
```

**Features:**
- View previous versions
- Rollback to earlier generation
- Compare different versions
- Analytics on success rate

### 2. Smart Regeneration
```typescript
const shouldRegenerate = () => {
  // Only regenerate if code changed
  const codeHash = hashCode(code);
  return codeHash !== lastCodeHash;
};
```

**Features:**
- Detect code changes automatically
- Show "Code updated, regenerate?" prompt
- Cache based on code hash
- Avoid unnecessary API calls

### 3. Manual Editing
```typescript
const [isEditing, setIsEditing] = useState(false);
const [editedCode, setEditedCode] = useState('');

<Button onClick={() => setIsEditing(true)}>
  Edit Custom UI
</Button>
```

**Features:**
- Edit generated React code
- Save custom modifications
- Merge with future regenerations
- Version control for custom changes

### 4. Regeneration Options
```typescript
<Select onChange={setRegenerationMode}>
  <option value="full">Full Regeneration</option>
  <option value="style">Style Only</option>
  <option value="logic">Logic Only</option>
  <option value="layout">Layout Only</option>
</Select>
```

**Features:**
- Partial regeneration
- Keep user preferences
- Selective updates
- Fine-grained control

## Error Handling

### Network Errors
```
❌ Network error occurred
   Could not connect to generation service

   [Try Again]  Check your internet connection
```

### API Key Errors
```
⚠️  API key not configured
   Dynamic test UI requires ANTHROPIC_API_KEY

   [Try Again]  Retry after configuring API key
```

### Generation Errors
```
❌ Failed to generate test interface
   The AI could not create a valid component

   [Try Again]  Generate a new test interface
```

### Render Errors
```
❌ Component could not be rendered
   Generated code has syntax errors

   [Try Again]  Try generating again
```

## Accessibility

### Keyboard Navigation
- Tab to button: `Tab`
- Activate button: `Enter` or `Space`
- Button has proper `aria-label`

### Screen Readers
```typescript
<Button
  aria-label="Regenerate custom test interface"
  aria-busy={loading}
  aria-live="polite"
>
  Regenerate
</Button>
```

### Focus Management
- Button gets focus after generation completes
- Loading state announced to screen readers
- Error messages are accessible

## Testing Checklist

### Manual Testing

- [ ] Click "Try Again" when error shows
- [ ] Click "Regenerate" when UI loaded
- [ ] Verify loading states
- [ ] Check button disabled during loading
- [ ] Test keyboard navigation
- [ ] Verify error messages
- [ ] Test with/without API key
- [ ] Check multiple rapid clicks

### Edge Cases

- [ ] Rapid clicking doesn't cause issues
- [ ] Network timeout handling
- [ ] API rate limiting response
- [ ] Invalid API key response
- [ ] Backend offline response
- [ ] Malformed response handling

## Summary

The regenerate button provides:

✅ **Self-service recovery** from errors
✅ **Easy testing** after configuration changes
✅ **Experimentation** with different UI versions
✅ **Clear feedback** during regeneration
✅ **Non-intrusive** placement in success state
✅ **Prominent** placement in error state

This significantly improves the user experience by giving users control over the dynamic test UI generation process!
