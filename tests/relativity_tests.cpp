#include "relativity.hpp"
#include <algorithm>
#include <cmath>
#include <iostream>
#include <limits>

using namespace relativity;
namespace {
int checks = 0, failures = 0;
void check(bool ok, const char* label) {
    ++checks;
    if (!ok) { ++failures; std::cerr << "FAIL: " << label << '\n'; }
}
// Absolute + relative tolerances: fixed cases ~1e-12; raw squared norms 2e-11.
// Inverse at the bound amplifies roundoff by exp(2*eta) <= 19999:
// 2e-10 allows ~45 double ulps times that conditioning, not a visual tolerance.
bool close(double actual, double expected, double tolerance = 1e-12) {
    return std::isfinite(actual) && std::abs(actual-expected) <=
           tolerance*(1.0+std::abs(expected));
}
void vector_check(Vec3 actual, Vec3 expected, double tolerance = 1e-12) {
    check(close(actual.x, expected.x, tolerance) && close(actual.y, expected.y, tolerance)
          && close(actual.z, expected.z, tolerance), "source direction");
}
Observation observed(Vec3 source, double eta, Vec3 axis = {1,0,0}) {
    Vec3 unit{}; Boost boost{}; Observation result{};
    check(normalize(source, unit), "normalize valid source");
    check(make_boost(eta, axis, boost), "construct valid boost");
    check(observe(unit, boost, result), "observe valid source");
    check(close(dot(result.direction, result.direction), 1.0, 2e-11), "raw unit norm");
    return result;
}
}
int main() {
    const double eta = std::log(2.0);
    Boost boost{};
    check(make_boost(eta, {1,0,0}, boost), "reference boost");
    check(close(boost.beta, 0.6) && close(boost.gamma, 1.25), "beta/gamma reference");
    const auto forward = observed({1,0,0}, eta);
    const auto backward = observed({-1,0,0}, eta);
    const auto transverse = observed({0,1,0}, eta);
    const auto observer_transverse = observed({-0.6,0.8,0}, eta);
    check(close(forward.doppler, 2) && close(forward.wavelength_nm, 275), "forward reference");
    check(close(backward.doppler, 0.5) && close(backward.wavelength_nm, 1100), "back reference");
    check(close(transverse.doppler, 1.25) && close(transverse.wavelength_nm, 440), "S transverse");
    check(close(observer_transverse.doppler, 0.8), "S-prime transverse D = 1/gamma");
    vector_check(forward.direction, {1,0,0});
    vector_check(backward.direction, {-1,0,0});
    vector_check(transverse.direction, {0.6,0.8,0});
    vector_check(observer_transverse.direction, {0,1,0});
    for (const double e : {0.0, eta, -eta, max_eta(), -max_eta()}) {
        check(close(observed({1,0,0}, e).doppler, std::exp(e)), "axial forward exponential");
        check(close(observed({-1,0,0}, e).doppler, std::exp(-e)), "axial backward exponential");
        check(close(observed({1,0,0}, e).doppler*observed({-1,0,0}, e).doppler, 1), "axial product");
        for (const Vec3 axis : {Vec3{1,0,0}, Vec3{1,2,-3}}) {
            Boost b{};
            check(make_boost(e, axis, b), "sweep boost");
            for (int i = 0; i < 257; ++i) {
                const double x = -1.0+2.0*i/256.0;
                const double radius = std::sqrt(std::max(0.0, 1.0-x*x));
                Vec3 s{};
                check(normalize({x, radius*std::cos(i*2.4), radius*std::sin(i*2.4)}, s), "sweep unit");
                const auto out = observed(s, e, axis);
                const auto inverse = observed(out.direction, -e, axis);
                vector_check(inverse.direction, s, 2e-10);
                check(close(out.doppler*inverse.doppler, 1, 2e-10), "inverse Doppler product");
                check(out.doppler >= std::exp(-std::abs(e))*(1-1e-12) &&
                      out.doppler <= std::exp(std::abs(e))*(1+1e-12), "D bounds");
                const double mu = dot(b.axis, s);
                check(close(dot(b.axis, out.direction), (mu+b.beta)/(1+b.beta*mu), 2e-11), "analytic aberration");
                if (e == 0) { vector_check(out.direction, s); check(close(out.doppler, 1), "rest D"); }
            }
        }
        for (const Vec3 s : {Vec3{1,1e-8,0}, Vec3{-1,1e-8,0}, Vec3{-1,1e-5,1e-7}}) {
            Vec3 unit{}; check(normalize(s, unit), "near-axis input");
            const auto out = observed(s, e);
            vector_check(observed(out.direction, -e).direction, unit, 2e-10);
        }
    }
    const double nan = std::numeric_limits<double>::quiet_NaN();
    const double inf = std::numeric_limits<double>::infinity();
    Vec3 unit{}; Observation out{};
    for (const Vec3 bad : {Vec3{0,0,0}, Vec3{nan,1,0}, Vec3{0,inf,0}, Vec3{0,0,-inf}}) {
        check(!normalize(bad, unit), "reject invalid direction");
        check(!make_boost(0, bad, boost), "reject invalid axis");
    }
    for (const double bad : {nan, inf, -inf, max_eta()+1e-8, -max_eta()-1e-8,
                            std::nextafter(max_eta(), inf), std::nextafter(-max_eta(), -inf)})
        check(!make_boost(bad, {1,0,0}, boost), "reject invalid rapidity");
    check(make_boost(0, {1,0,0}, boost), "rest boost");
    check(!observe({2,0,0}, boost, out), "reject non-unit unchecked input");
    check(!observe({nan,0,0}, boost, out), "reject nonfinite unchecked input");
    check(normalize({1e308,1e308,0}, unit), "large finite vector");
    check(normalize({1e-310,0,0}, unit), "tiny finite vector");
    std::cout << checks << " checks, " << failures << " failures\n";
    return failures == 0 ? 0 : 1;
}
