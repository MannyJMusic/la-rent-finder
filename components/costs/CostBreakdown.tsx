'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Zap,
  Droplets,
  Wifi,
  Shield,
  ParkingSquare,
  PawPrint,
  Truck,
  Package,
  Warehouse,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

export interface CostEstimate {
  id?: string;
  listing_id?: string;
  // Move-in costs
  first_month_rent: number;
  last_month_rent: number;
  security_deposit: number;
  pet_deposit: number;
  application_fee: number;
  broker_fee: number;
  move_in_total: number;
  // Monthly costs
  monthly_rent: number;
  utilities_estimate: number;
  parking_fee: number;
  pet_rent: number;
  renters_insurance: number;
  monthly_total: number;
  // Moving costs
  moving_company_quote: number;
  packing_materials: number;
  storage_costs: number;
  travel_costs: number;
  moving_total: number;
  // Notes
  estimate_notes?: string;
}

interface CostBreakdownProps {
  estimate: CostEstimate;
  title?: string;
  compact?: boolean;
}

function formatDollar(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

interface CostLineProps {
  label: string;
  amount: number;
  icon?: React.ReactNode;
  highlight?: boolean;
}

function CostLine({ label, amount, icon, highlight }: CostLineProps) {
  if (amount === 0) return null;

  return (
    <div
      className={`flex items-center justify-between py-1.5 ${
        highlight
          ? 'font-semibold text-foreground border-t border-border pt-3 mt-2'
          : 'text-muted-foreground'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm tabular-nums ${highlight ? 'text-primary text-base' : ''}`}>
        {formatDollar(amount)}
      </span>
    </div>
  );
}

export default function CostBreakdown({ estimate, title, compact = false }: CostBreakdownProps) {
  const firstYearTotal = estimate.move_in_total + estimate.monthly_total * 12 + estimate.moving_total;

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      )}

      {/* Move-in Costs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Move-in Costs
            </CardTitle>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {formatDollar(estimate.move_in_total)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-0">
            <CostLine
              label="First month's rent"
              amount={estimate.first_month_rent}
              icon={<Home className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Last month's rent"
              amount={estimate.last_month_rent}
              icon={<Home className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Security deposit"
              amount={estimate.security_deposit}
              icon={<Shield className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Pet deposit"
              amount={estimate.pet_deposit}
              icon={<PawPrint className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Application fee"
              amount={estimate.application_fee}
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Broker fee"
              amount={estimate.broker_fee}
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
            {!compact && (
              <CostLine
                label="Total move-in"
                amount={estimate.move_in_total}
                highlight
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Costs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Monthly Costs
            </CardTitle>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {formatDollar(estimate.monthly_total)}/mo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-0">
            <CostLine
              label="Rent"
              amount={estimate.monthly_rent}
              icon={<Home className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Utilities (est.)"
              amount={estimate.utilities_estimate}
              icon={<Zap className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Parking"
              amount={estimate.parking_fee}
              icon={<ParkingSquare className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Pet rent"
              amount={estimate.pet_rent}
              icon={<PawPrint className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Renter's insurance"
              amount={estimate.renters_insurance}
              icon={<Shield className="h-3.5 w-3.5" />}
            />
            {!compact && (
              <CostLine
                label="Total monthly"
                amount={estimate.monthly_total}
                highlight
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Moving Costs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Moving Costs
            </CardTitle>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {formatDollar(estimate.moving_total)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-0">
            <CostLine
              label="Moving company"
              amount={estimate.moving_company_quote}
              icon={<Truck className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Packing materials"
              amount={estimate.packing_materials}
              icon={<Package className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Storage"
              amount={estimate.storage_costs}
              icon={<Warehouse className="h-3.5 w-3.5" />}
            />
            <CostLine
              label="Travel costs"
              amount={estimate.travel_costs}
              icon={<DollarSign className="h-3.5 w-3.5" />}
            />
            {!compact && (
              <CostLine
                label="Total moving"
                amount={estimate.moving_total}
                highlight
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">First-year total cost</p>
              <p className="text-2xl font-bold text-primary">
                {formatDollar(firstYearTotal)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Move-in: {formatDollar(estimate.move_in_total)}</p>
              <p>Monthly x12: {formatDollar(estimate.monthly_total * 12)}</p>
              <p>Moving: {formatDollar(estimate.moving_total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { formatDollar };
