package engine

import (
	"fmt"
	"reflect"

	"weave/internal/graph"
)

// ApplyReducer computes the new state value given the current value, an update, and the declared reducer.
func ApplyReducer(reducer graph.StateReducer, current any, update any) (any, error) {
	switch reducer {
	case graph.ReducerOverwrite:
		return update, nil

	case graph.ReducerAppend:
		var list []any
		if current == nil {
			list = make([]any, 0)
		} else if s, ok := current.([]any); ok {
			list = append([]any(nil), s...)
		} else {
			// Convert single item to slice
			list = []any{current}
		}

		// If update is also a slice, append each item, else append update directly
		if updateSlice, ok := update.([]any); ok {
			list = append(list, updateSlice...)
		} else {
			list = append(list, update)
		}
		return list, nil

	case graph.ReducerMerge:
		currentMap, okCurrent := current.(map[string]any)
		if current == nil {
			currentMap = make(map[string]any)
			okCurrent = true
		}
		updateMap, okUpdate := update.(map[string]any)
		if !okCurrent || !okUpdate {
			return nil, fmt.Errorf("reducer 'merge' requires object types, got current %T, update %T", current, update)
		}

		result := make(map[string]any, len(currentMap)+len(updateMap))
		for k, v := range currentMap {
			result[k] = v
		}
		for k, v := range updateMap {
			result[k] = v
		}
		return result, nil

	case graph.ReducerErrorOnConflict:
		if current == nil {
			return update, nil
		}
		if reflect.DeepEqual(current, update) {
			return current, nil
		}
		return nil, fmt.Errorf("conflict detected: existing value (%v) does not match new value (%v)", current, update)

	default:
		return update, nil
	}
}
