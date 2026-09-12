#include "relativity.hpp"
#include <array>
#include <cmath>
#include <emscripten/emscripten.h>

namespace {
constexpr int capacity = 4096;
// Module-owned fixed storage; no allocation or memory growth. All pointer exports
// are non-owning byte addresses, valid until this module is destroyed.
// Input: Float64, stride 3 (x,y,z), capacity*3 elements. JS writes before rd_load.
// Output: Float64, stride 4 (x',y',z',D), count*4 elements. Read-only to JS.
// HUD: 10 Float64 values: eta,beta,gamma,etaMax, Df,Db,Dt, lambdaF,lambdaB,lambdaT.
// JS creates fresh views per update, so it never retains a view across a call.
std::array<double, capacity*3> input{};
std::array<relativity::Vec3, capacity> catalogue{};
std::array<double, capacity*4> output{};
std::array<double, 10> hud{};
int count = 0;
}
extern "C" {
EMSCRIPTEN_KEEPALIVE int rd_capacity() { return capacity; }
EMSCRIPTEN_KEEPALIVE double* rd_input() { return input.data(); }
EMSCRIPTEN_KEEPALIVE const double* rd_output() { return output.data(); }
EMSCRIPTEN_KEEPALIVE const double* rd_hud() { return hud.data(); }
EMSCRIPTEN_KEEPALIVE double rd_preset(int index) {
    constexpr std::array<double, 5> speeds{0.0, 0.6, 0.9, 0.99, relativity::max_beta};
    if (index < 0 || index >= static_cast<int>(speeds.size())) return -1.0;
    return std::atanh(speeds[index]);
}
EMSCRIPTEN_KEEPALIVE int rd_load(int size) {
    count = 0;
    if (size < 3 || size > capacity) return 0;
    for (int i = 0; i < size; ++i) {
        if (!relativity::normalize({input[3*i], input[3*i+1], input[3*i+2]}, catalogue[i])) return 0;
    }
    count = size;
    return 1;
}
EMSCRIPTEN_KEEPALIVE int rd_update(double eta) {
    relativity::Boost boost{};
    if (count == 0 || !relativity::make_boost(eta, {1,0,0}, boost)) return 0;
    for (int i = 0; i < count; ++i) {
        relativity::Observation star{};
        if (!relativity::observe(catalogue[i], boost, star)) return 0;
        output[4*i] = star.direction.x;
        output[4*i+1] = star.direction.y;
        output[4*i+2] = star.direction.z;
        output[4*i+3] = star.doppler;
    }
    hud[0] = boost.eta; hud[1] = boost.beta; hud[2] = boost.gamma; hud[3] = relativity::max_eta();
    const std::array<relativity::Vec3, 3> reference{{{1,0,0}, {-1,0,0}, {0,1,0}}};
    for (int i = 0; i < 3; ++i) {
        relativity::Observation star{};
        if (!relativity::observe(reference[i], boost, star)) return 0;
        hud[4+i] = star.doppler; hud[7+i] = star.wavelength_nm;
    }
    return 1;
}
}
