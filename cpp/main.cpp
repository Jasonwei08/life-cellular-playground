// Command-line harness for the C++ port of engine.js: runs a few generations
// of a chosen pattern, printing the grid and generation stats to stdout.
//
// Usage: life [pattern-id] [generations]
//   pattern-id defaults to "glider"; generations defaults to 4.

#include "engine.hpp"

#include <algorithm>
#include <cstdlib>
#include <iostream>

namespace {

void printGrid(const std::vector<std::uint8_t>& cells, int cols, int rows) {
    for (int y = 0; y < rows; ++y) {
        for (int x = 0; x < cols; ++x) {
            std::cout << (cells[static_cast<std::size_t>(y) * cols + x] ? '#' : '.');
        }
        std::cout << '\n';
    }
}

} // namespace

int main(int argc, char** argv) {
    const std::string patternId = argc > 1 ? argv[1] : "glider";
    const int generations = argc > 2 ? std::atoi(argv[2]) : 4;

    const auto it = std::find_if(life::patterns.begin(), life::patterns.end(),
                                  [&](const life::Pattern& p) { return p.id == patternId; });
    if (it == life::patterns.end()) {
        std::cerr << "Unknown pattern: " << patternId << "\n";
        return 1;
    }

    auto cells = life::createPattern(*it);
    long generation = 0;

    std::cout << "Loaded " << it->name << " (" << it->type << ")\n";
    printGrid(cells, life::COLS, life::ROWS);

    for (int step = 0; step < generations; ++step) {
        auto result = life::evolve(cells);
        cells = std::move(result.cells);
        ++generation;
        std::cout << "\nGeneration " << generation << " -- population " << result.population
                   << ", births " << result.births << ", deaths " << result.deaths << "\n";
        printGrid(cells, life::COLS, life::ROWS);
    }

    return 0;
}
