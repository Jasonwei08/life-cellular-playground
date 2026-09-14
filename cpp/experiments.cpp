#include "experiments.hpp"
#include <algorithm>
#include <iomanip>
#include <numeric>
#include <sstream>
#include <stdexcept>

namespace life {
std::vector<std::uint8_t> semantic(std::vector<std::uint8_t> cells, int states) {
    if (states == 2) for (auto& c : cells) c = c > 0;
    return cells;
}
int recurrence(const std::vector<std::vector<std::uint8_t>>& history,
               const std::vector<std::uint8_t>& cells) {
    for (int p = 1; p <= static_cast<int>(history.size()); ++p)
        if (cells == history[history.size() - p]) return p;
    return 0;
}
std::vector<Rule> sampleRules(std::uint32_t seed, int count) {
    if (count < 1 || count > 262144) throw std::invalid_argument("Invalid sample size");
    Random random(seed);
    std::vector<bool> seen(262144, false);
    std::vector<Rule> rules;
    while (static_cast<int>(rules.size()) < count) {
        const auto bits = random.next() >> 14; // Use the high bits, not weak LCG low bits.
        if (seen[bits]) continue;
        seen[bits] = true;
        rules.push_back(Rule{static_cast<std::uint16_t>(bits & 511),
                             static_cast<std::uint16_t>(bits >> 9)});
    }
    return rules;
}
TrialResult runTrial(const TrialConfig& c) {
    if (c.steps < 1 || c.steps > 2000) throw std::invalid_argument("Steps must be 1..2000");
    auto cells = randomGrid(c.cols, c.rows, c.density, c.seed);
    TrialResult r;
    r.initial = cells;
    auto baseline = cells;
    auto deterministic = c.options;
    deterministic.noise = 0;
    Random noise(c.seed ^ 0x9e3779b9u), unused(0);
    std::vector<std::vector<std::uint8_t>> history;
    const double size = cells.size();
    auto record = [&](const std::vector<std::uint8_t>& grid) {
        const auto population = std::count_if(grid.begin(), grid.end(),
            [&](auto v) { return active(v, c.options.states); });
        r.density.push_back(population / size);
        r.occupied.push_back(std::count_if(grid.begin(), grid.end(), [](auto v) { return v > 0; }) / size);
        if (population == 0 && r.firstEmpty < 0) r.firstEmpty = static_cast<int>(r.density.size()) - 1;
    };
    record(cells);
    r.change.push_back(0);
    r.distance.push_back(0);
    for (int t = 1; t <= c.steps; ++t) {
        auto previous = semantic(cells, c.options.states);
        history.push_back(previous);
        if (history.size() > 16) history.erase(history.begin());
        cells = advance(cells, c.cols, c.rows, c.options, noise).cells;
        if (c.options.noise > 0) baseline = advance(baseline, c.cols, c.rows, deterministic, unused).cells;
        auto current = semantic(cells, c.options.states);
        auto reference = c.options.noise > 0 ? semantic(baseline, c.options.states) : current;
        int changed = 0, different = 0;
        for (std::size_t i = 0; i < cells.size(); ++i) {
            changed += previous[i] != current[i];
            different += reference[i] != current[i];
        }
        r.change.push_back(changed / size);
        r.distance.push_back(different / size);
        record(cells);
        r.period = recurrence(history, current);
    }
    const int window = std::max(1, c.steps / 4);
    auto tailMean = [&](const std::vector<double>& v) {
        return std::accumulate(v.end() - window, v.end(), 0.0) / window;
    };
    r.tailChange = tailMean(r.change);
    r.growth = tailMean(r.density) -
        std::accumulate(r.density.begin(), r.density.begin() + window, 0.0) / window;
    // These labels describe an observed trajectory, never the whole rule space.
    if (r.density.back() == 0 && c.options.noise == 0 && !(c.options.rule.birth & 1))
        r.category = "extinction";
    else if (r.period == 1 && c.options.noise == 0) r.category = "stable";
    else if (r.period > 1 && c.options.noise == 0) r.category = "oscillatory";
    else if (r.growth > 0.1) r.category = "growing";
    else if (r.tailChange > 0.15) r.category = "disordered";
    else r.category = "unclassified";
    r.finalCells = cells;
    return r;
}
std::string trialJson(const TrialConfig& c, const TrialResult& r) {
    std::ostringstream out;
    out << std::setprecision(17);
    out << "{\"version\":1,\"rule\":\"" << c.options.rule.notation()
        << "\",\"states\":" << c.options.states << ",\"noise\":" << c.options.noise
        << ",\"seed\":" << c.seed << ",\"noiseSeed\":" << (c.seed ^ 0x9e3779b9u)
        << ",\"cols\":" << c.cols << ",\"rows\":" << c.rows << ",\"steps\":" << c.steps
        << ",\"initialDensity\":" << c.density << ",\"category\":\"" << r.category
        << "\",\"firstEmpty\":" << r.firstEmpty << ",\"terminalPeriod\":" << r.period
        << ",\"tailChange\":" << r.tailChange << ",\"growth\":" << r.growth;
    auto array = [&](const char* name, const auto& values) {
        out << ",\"" << name << "\":[";
        bool first = true;
        for (auto value : values) { if (!first) out << ','; first = false; out << +value; }
        out << ']';
    };
    array("density", r.density); array("occupied", r.occupied);
    array("change", r.change); array("distance", r.distance);
    array("initial", r.initial); array("final", r.finalCells);
    out << '}';
    return out.str();
}
} // namespace life
