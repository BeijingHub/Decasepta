import pygame
import random
import math

# Initialize
pygame.init()
WIDTH, HEIGHT = 806, 401
win = pygame.display.set_mode((WIDTH, HEIGHT))
clock = pygame.time.Clock()
FPS = 60
# === START: Score Increment ===
score += speed * 0.1  # increase based on movement
# === END: Score Increment ===

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# Player
player = pygame.Rect(100, HEIGHT//2, 30, 30)
gravity = 1
velocity_y = 0
on_ground = True
# === START: Game Stats ===
score = 0
lives = 3
start_ticks = pygame.time.get_ticks()
font = pygame.font.SysFont(None, 24)
# === END: Game Stats ===

# Game variables
speed = 2.0
acceleration = 0.05
max_speed = 10
ground_y = HEIGHT - 50
ground_points = [(0, ground_y)]
chaser_x = 0

def generate_terrain():
    global ground_points, speed
    while ground_points[-1][0] < WIDTH + 100:
        last_x, last_y = ground_points[-1]
        slope = min(0.2 * speed, 1.5)
        delta_y = random.uniform(-slope, slope) * 10
        new_y = min(max(ground_y + delta_y, HEIGHT//2), HEIGHT - 20)
        ground_points.append((last_x + 20, new_y))

def draw_ground():
    for i in range(len(ground_points) - 1):
        pygame.draw.line(win, BLACK, ground_points[i], ground_points[i+1], 3)

def get_ground_height_at(x):
    for i in range(len(ground_points)-1):
        x1, y1 = ground_points[i]
        x2, y2 = ground_points[i+1]
        if x1 <= x <= x2:
            t = (x - x1) / (x2 - x1)
            return y1 + t * (y2 - y1)
    return ground_y

# Main loop
run = True
while run:
    win.fill(WHITE)
    clock.tick(FPS)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            run = False

    # Input: One-button speed control
    keys = pygame.key.get_pressed()
    if keys[pygame.K_SPACE]:
        speed = min(speed + acceleration, max_speed)
    else:
        speed = max(speed - acceleration * 1.5, 2)

    # Move terrain left
    for i in range(len(ground_points)):
        x, y = ground_points[i]
        ground_points[i] = (x - speed, y)
    while ground_points and ground_points[0][0] < -100:
        ground_points.pop(0)

    generate_terrain()
    draw_ground()

    # Apply gravity
    ground_under = get_ground_height_at(player.x)
    if player.bottom < ground_under:
        velocity_y += gravity
        player.y += velocity_y
        on_ground = False
    else:
        player.bottom = ground_under
        velocity_y = 0
        on_ground = True

    # Draw player
    pygame.draw.rect(win, (255, 0, 0), player)

    # === START: Chaser Logic with Score Steal ===
chaser_x += 1.0
if chaser_x >= player.x:
    print("Chaser stole your score!")
    score = max(0, score - 50)  # deduct score
    chaser_x = player.x - 150   # push chaser back
# === END: Chaser Logic ===


    pyga# === START: HUD ===
elapsed_time = (pygame.time.get_ticks() - start_ticks) // 1000
hud = font.render(f"Lives: {lives}  Score: {int(score)}  Time: {elapsed_time}s", True, BLACK)
win.blit(hud, (10, 10))
# === END: HUD ===
me.display.update()


# === START: Show Final Score ===
pygame.quit()
final_time = (pygame.time.get_ticks() - start_ticks) // 1000
print("\n--- Game Over ---")
print(f"Score: {int(score)}")
print(f"Time Played: {final_time} seconds")
# === END: Final Score ===
