
import math

# Path Data
# M 29.157 7.334 
# C 19.849 -2.873 5.314 6.426 1.491 29.737 
# C 1.525 29.74 8.008 21.517 8.021 21.457 
# C 10.16 11.879 17.483 -0.662 29.157 7.334 Z

path_segments = [
    {'type': 'M', 'pts': [(29.157, 7.334)]},
    {'type': 'C', 'pts': [(29.157, 7.334), (19.849, -2.873), (5.314, 6.426), (1.491, 29.737)]},
    {'type': 'C', 'pts': [(1.491, 29.737), (1.525, 29.74), (8.008, 21.517), (8.021, 21.457)]},
    {'type': 'C', 'pts': [(8.021, 21.457), (10.16, 11.879), (17.483, -0.662), (29.157, 7.334)]}
]

def cubic_bezier_bounds(p0, p1, p2, p3):
    # p = (1-t)^3*p0 + 3*(1-t)^2*t*p1 + 3*(1-t)*t^2*p2 + t^3*p3
    # derivative B'(t) is quadratic
    # x(t) = ... find roots of x'(t)=0 for extremes
    
    def get_extremes(v0, v1, v2, v3):
        # Derivative coefficients for at^2 + bt + c = 0
        a = 3 * (-v0 + 3*v1 - 3*v2 + v3)
        b = 6 * (v0 - 2*v1 + v2)
        c = 3 * (-v0 + v1)
        
        roots = []
        if abs(a) < 1e-9:
            if abs(b) > 1e-9:
                t = -c / b
                if 0 <= t <= 1: roots.append(t)
        else:
            disc = b*b - 4*a*c
            if disc >= 0:
                t1 = (-b + math.sqrt(disc)) / (2*a)
                t2 = (-b - math.sqrt(disc)) / (2*a)
                if 0 <= t1 <= 1: roots.append(t1)
                if 0 <= t2 <= 1: roots.append(t2)
        
        return roots

    x_roots = get_extremes(p0[0], p1[0], p2[0], p3[0])
    y_roots = get_extremes(p0[1], p1[1], p2[1], p3[1])
    
    vals_t = [0, 1] + x_roots + y_roots
    
    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')
    
    for t in vals_t:
        mt = 1-t
        x = mt**3*p0[0] + 3*mt**2*t*p1[0] + 3*mt*t**2*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt**2*t*p1[1] + 3*mt*t**2*p2[1] + t**3*p3[1]
        
        min_x = min(min_x, x)
        max_x = max(max_x, x)
        min_y = min(min_y, y)
        max_y = max(max_y, y)
        
    return (min_x, max_x, min_y, max_y)

total_min_x, total_max_x = float('inf'), float('-inf')
total_min_y, total_max_y = float('inf'), float('-inf')

print("Segments Analysis:")
for segment in path_segments:
    if segment['type'] == 'C':
        pts = segment['pts']
        bounds = cubic_bezier_bounds(pts[0], pts[1], pts[2], pts[3])
        total_min_x = min(total_min_x, bounds[0])
        total_max_x = max(total_max_x, bounds[1])
        total_min_y = min(total_min_y, bounds[2])
        total_max_y = max(total_max_y, bounds[3])
        print(f"  Segment: {pts}")
        print(f"    Bounds: x[{bounds[0]:.4f}, {bounds[1]:.4f}] y[{bounds[2]:.4f}, {bounds[3]:.4f}]")

print("-" * 20)
width = total_max_x - total_min_x
height = total_max_y - total_min_y

print(f"Total Bounding Box: x[{total_min_x:.4f}, {total_max_x:.4f}] y[{total_min_y:.4f}, {total_max_y:.4f}]")
print(f"Width: {width:.4f}")
print(f"Height: {height:.4f}")
print(f"Aspect Ratio (W/H): {width/height:.4f}")
print(f"Aspect Ratio (H/W): {height/width:.4f}")

phi = 1.61803398875
print(f"Golden Ratio (phi): {phi:.4f}")
