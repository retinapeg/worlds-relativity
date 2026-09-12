#pragma once

namespace relativity {
constexpr double max_beta = 0.9999;
constexpr double calibration_nm = 550.0;
struct Vec3 { double x, y, z; };
struct Boost {
    Vec3 axis;
    double eta, beta, gamma, exp_eta, exp_minus_eta;
};
struct Observation { Vec3 direction; double doppler, wavelength_nm; };

double max_eta();
double dot(Vec3 a, Vec3 b);
bool normalize(Vec3 input, Vec3& unit);
bool make_boost(double eta, Vec3 axis, Boost& result);
// Input must already be normalized; boost must come from make_boost.
// Returns the raw direction, with a norm check and NO output renormalization.
bool observe(Vec3 unit_source, const Boost& boost, Observation& result);
} // namespace relativity
