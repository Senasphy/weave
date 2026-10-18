package api

import (
	"net/http"
	"sort"
	"strings"

	"weave/internal/llm"
)

type ModelPriceDTO struct {
	Provider      string  `json:"provider"`
	Model         string  `json:"model"`
	InputPerMTok  float64 `json:"input_per_mtok"`
	OutputPerMTok float64 `json:"output_per_mtok"`
}

func (s *Server) handleListModels(w http.ResponseWriter, r *http.Request) {
	models := make([]ModelPriceDTO, 0, len(llm.DefaultModelPriceTable))
	for k, price := range llm.DefaultModelPriceTable {
		parts := strings.SplitN(k, ":", 2)
		if len(parts) == 2 {
			models = append(models, ModelPriceDTO{
				Provider:      parts[0],
				Model:         parts[1],
				InputPerMTok:  price.InputPerMTok,
				OutputPerMTok: price.OutputPerMTok,
			})
		}
	}
	sort.Slice(models, func(i, j int) bool {
		if models[i].Provider == models[j].Provider {
			return models[i].Model < models[j].Model
		}
		return models[i].Provider < models[j].Provider
	})
	WriteJSON(w, http.StatusOK, models)
}
