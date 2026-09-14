#pragma once
#include "engine.hpp"

namespace life {
struct TrialConfig {
    int cols = 32, rows = 32, steps = 200;
    double density = 0.2;
    std::uint32_t seed = 42;
    Options options;
};
struct TrialResult {
    std::vector<double> density, occupied, change, distance;
    std::vector<std::uint8_t> initial, finalCells;
    int firstEmpty = -1, period = 0;
    double tailChange = 0, growth = 0;
    std::string category;
};
// Compare semantic states: binary ages are visual metadata, not CA states.
std::vector<std::uint8_t> semantic(std::vector<std::uint8_t> cells, int states);
int recurrence(const std::vector<std::vector<std::uint8_t>>& history,
               const std::vector<std::uint8_t>& cells);
std::vector<Rule> sampleRules(std::uint32_t seed, int count = 100);
TrialResult runTrial(const TrialConfig& config);
std::string trialJson(const TrialConfig& config, const TrialResult& result);
} // namespace life
