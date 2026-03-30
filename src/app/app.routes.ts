import { Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page/dashboard-page';
import { HeapArenaComponent } from './features/heap/heap-arena/heap-arena';
import { ExerciseDetailPageComponent } from './pages/exercise-detail/exercise-detail-page/exercise-detail-page';
import { RbTreeBuilderComponent } from './features/rb-tree/rb-tree-builder/rb-tree-builder';
import { HuffmanBuilderComponent } from './features/huffman/huffman-builder/huffman-builder';
import { StringDpLabComponent } from './features/string-dp/string-dp-lab/string-dp-lab';
import { HashOpenLabComponent } from './features/hash-table/hash-open-lab/hash-open-lab';
import { ShortestPathLabComponent } from './features/graphs/shortest-path-lab/shortest-path-lab';
import { MasterTheoremLabComponent } from './features/master-theorem/master-theorem-lab/master-theorem-lab';
import { LoginPageComponent } from './pages/auth/login-page/login-page';
import { RegisterPageComponent } from './pages/auth/register-page/register-page';
import { ForgotPasswordPageComponent } from './pages/auth/forgot-password-page/forgot-password-page';
import { ResetPasswordPageComponent } from './pages/auth/reset-password-page/reset-password-page';
import { authGuard } from './core/guards/auth.guard';
import { CodeArenaPageComponent } from './pages/code-arena/code-arena-page/code-arena-page';
import { LeaderboardPageComponent } from './pages/leaderboard/leaderboard-page/leaderboard-page';
import { UserProfilePageComponent } from './pages/user-profile/user-profile-page/user-profile-page';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  { path: 'code-arena', component: CodeArenaPageComponent, canActivate: [authGuard] },
  { path: 'leaderboard', component: LeaderboardPageComponent, canActivate: [authGuard] },
  { path: 'users/:id', component: UserProfilePageComponent, canActivate: [authGuard] },
  { path: '', component: DashboardPageComponent, pathMatch: 'full', canActivate: [authGuard] },
  { path: 'heap', component: HeapArenaComponent, canActivate: [authGuard] },
  { path: 'rb-tree', component: RbTreeBuilderComponent, canActivate: [authGuard] },
  { path: 'graphs/lab', component: ShortestPathLabComponent, canActivate: [authGuard] },
  { path: 'huffman', component: HuffmanBuilderComponent, canActivate: [authGuard] },
  { path: 'strings/dp', component: StringDpLabComponent, canActivate: [authGuard] },
  { path: 'hash/open', component: HashOpenLabComponent, canActivate: [authGuard] },
  { path: 'master-theorem', component: MasterTheoremLabComponent, canActivate: [authGuard] },
  { path: 'exercise/:id', component: ExerciseDetailPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
