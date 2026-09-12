#include "relativity.hpp"
#include <algorithm>
#include <cmath>

namespace relativity {
double max_eta() { return std::atanh(max_beta); }
double dot(Vec3 a, Vec3 b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
namespace {
bool finite(Vec3 v) {
    return std::isfinite(v.x) && std::isfinite(v.y) && std::isfinite(v.z);
}
}
bool normalize(Vec3 input, Vec3& unit) {
    if (!finite(input)) return false;
    const double scale = std::max({std::abs(input.x), std::abs(input.y), std::abs(input.z)});
    if (scale == 0.0) return false;
    // Scaling first also accepts finite vectors near overflow or underflow.
    const Vec3 scaled{input.x/scale, input.y/scale, input.z/scale};
    const double length = std::sqrt(dot(scaled, scaled));
    unit = {scaled.x/length, scaled.y/length, scaled.z/length};
    return true;
}
bool make_boost(double eta, Vec3 axis, Boost& result) {
    if (!std::isfinite(eta) || std::abs(eta) > max_eta()) return false;
    Vec3 unit{};
    if (!normalize(axis, unit)) return false;
    // Exponentials are evaluated once per velocity update, not per star.
    result = {unit, eta, std::tanh(eta), std::cosh(eta), std::exp(eta), std::exp(-eta)};
    return true;
}
bool observe(Vec3 source, const Boost& boost, Observation& result) {
    if (!finite(source) || std::abs(dot(source, source)-1.0) > 2e-12) return false;
    // s points TOWARD the source; photons propagate along -s (MATH.md).
    const double mu = std::clamp(dot(boost.axis, source), -1.0, 1.0);
    const double p = 0.5*(1.0+mu)*boost.exp_eta;
    const double q = 0.5*(1.0-mu)*boost.exp_minus_eta;
    const double d = p+q;
    const double a = p-q;
    if (!std::isfinite(d) || d <= 0.0) return false;
    const Vec3 perpendicular{source.x-mu*boost.axis.x, source.y-mu*boost.axis.y,
                             source.z-mu*boost.axis.z};
    const Vec3 shifted{(perpendicular.x+a*boost.axis.x)/d,
                       (perpendicular.y+a*boost.axis.y)/d,
                       (perpendicular.z+a*boost.axis.z)/d};
    // A substantial error fails visibly. Tests inspect this raw norm more tightly.
    if (!finite(shifted) || std::abs(dot(shifted, shifted)-1.0) > 1e-9) return false;
    const double wavelength = calibration_nm/d;
    if (!std::isfinite(wavelength)) return false;
    result = {shifted, d, wavelength};
    return true;
}
} // namespace relativity
