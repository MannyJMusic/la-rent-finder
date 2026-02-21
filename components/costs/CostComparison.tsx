'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingDown, ArrowRight, DollarSign, Truck } from 'lucide-react';
import { CostEstimate, formatDollar } from './CostBreakdown';
import { cn } from '@/lib/utils';

interface PropertyEstimate {
  id: string;
  title: string;
  address?: string;
  price: number;
  estimate: CostEstimate;
}

interface CostComparisonProps {
  properties: PropertyEstimate[];
}

/**
 * Finds the index(es) of the lowest value in an array of numbers.
 * Returns indices of all properties that share the minimum.
 */
function findLowestIndices(values: number[]): number[] {
  const min = Math.min(...values);
  return values.reduce<number[]>((acc, val, idx) => {
    if (val === min) acc.push(idx);
    return acc;
  }, []);
}

interface ComparisonRowProps {
  label: string;
  values: number[];
  highlightLowest?: boolean;
  isTotal?: boolean;
}

function ComparisonRow({ label, values, highlightLowest = true, isTotal = false }: ComparisonRowProps) {
  const lowestIndices = highlightLowest ? findLowestIndices(values) : [];

  return (
    <div
      className={cn(
        'grid items-center gap-3 py-2',
        isTotal ? 'border-t border-border pt-3 mt-1' : '',
      )}
      style={{ gridTemplateColumns: `180px repeat(${values.length}, 1fr)` }}
    >
      <span
        className={cn(
          'text-sm truncate',
          isTotal ? 'font-semibold text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
      {values.map((value, idx) => {
        const isLowest = lowestIndices.includes(idx) && lowestIndices.length < values.length;
        return (
          <span
            key={idx}
            className={cn(
              'text-sm tabular-nums text-right',
              isTotal ? 'font-bold text-base' : '',
              isLowest ? 'text-emerald-400 font-medium' : isTotal ? 'text-primary' : 'text-foreground',
            )}
          >
            {formatDollar(value)}
            {isLowest && !isTotal && (
              <TrendingDown className="inline-block h-3 w-3 ml-1 text-emerald-400" />
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function CostComparison({ properties }: CostComparisonProps) {
  if (properties.length === 0) return null;

  const firstYearTotals = properties.map(
    (p) => p.estimate.move_in_total + p.estimate.monthly_total * 12 + p.estimate.moving_total
  );
  const bestValueIdx = firstYearTotals.indexOf(Math.min(...firstYearTotals));

  const colCount = properties.length;

  return (
    <div className="space-y-6">
      {/* Property Headers */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `180px repeat(${colCount}, 1fr)` }}
      >
        <div /> {/* Empty cell for the label column */}
        {properties.map((prop, idx) => (
          <Card
            key={prop.id}
            className={cn(
              'text-center',
              idx === bestValueIdx ? 'border-emerald-500/50 bg-emerald-500/5' : ''
            )}
          >
            <CardContent className="py-3 px-2">
              <p className="font-semibold text-sm truncate" title={prop.title}>
                {prop.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">{prop.address}</p>
              <p className="text-lg font-bold text-primary mt-1">
                {formatDollar(prop.price)}
                <span className="text-xs text-muted-foreground font-normal">/mo</span>
              </p>
              {idx === bestValueIdx && (
                <Badge className="mt-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <Trophy className="h-3 w-3 mr-1" />
                  Best Value
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Move-in Costs Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            Move-in Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <ComparisonRow
            label="First month's rent"
            values={properties.map((p) => p.estimate.first_month_rent)}
          />
          <ComparisonRow
            label="Last month's rent"
            values={properties.map((p) => p.estimate.last_month_rent)}
          />
          <ComparisonRow
            label="Security deposit"
            values={properties.map((p) => p.estimate.security_deposit)}
          />
          <ComparisonRow
            label="Pet deposit"
            values={properties.map((p) => p.estimate.pet_deposit)}
          />
          <ComparisonRow
            label="Application fee"
            values={properties.map((p) => p.estimate.application_fee)}
          />
          <ComparisonRow
            label="Broker fee"
            values={properties.map((p) => p.estimate.broker_fee)}
          />
          <ComparisonRow
            label="Total move-in"
            values={properties.map((p) => p.estimate.move_in_total)}
            isTotal
          />
        </CardContent>
      </Card>

      {/* Monthly Costs Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Monthly Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <ComparisonRow
            label="Rent"
            values={properties.map((p) => p.estimate.monthly_rent)}
          />
          <ComparisonRow
            label="Utilities (est.)"
            values={properties.map((p) => p.estimate.utilities_estimate)}
          />
          <ComparisonRow
            label="Parking"
            values={properties.map((p) => p.estimate.parking_fee)}
          />
          <ComparisonRow
            label="Pet rent"
            values={properties.map((p) => p.estimate.pet_rent)}
          />
          <ComparisonRow
            label="Renter's insurance"
            values={properties.map((p) => p.estimate.renters_insurance)}
          />
          <ComparisonRow
            label="Total monthly"
            values={properties.map((p) => p.estimate.monthly_total)}
            isTotal
          />
        </CardContent>
      </Card>

      {/* Moving Costs Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Moving Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <ComparisonRow
            label="Moving company"
            values={properties.map((p) => p.estimate.moving_company_quote)}
          />
          <ComparisonRow
            label="Packing materials"
            values={properties.map((p) => p.estimate.packing_materials)}
          />
          <ComparisonRow
            label="Storage"
            values={properties.map((p) => p.estimate.storage_costs)}
          />
          <ComparisonRow
            label="Travel costs"
            values={properties.map((p) => p.estimate.travel_costs)}
          />
          <ComparisonRow
            label="Total moving"
            values={properties.map((p) => p.estimate.moving_total)}
            isTotal
          />
        </CardContent>
      </Card>

      {/* Grand Total / First-Year Comparison */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4 overflow-x-auto">
          <div
            className="grid gap-3 items-center"
            style={{ gridTemplateColumns: `180px repeat(${colCount}, 1fr)` }}
          >
            <div>
              <p className="text-sm font-semibold text-foreground">First-year total</p>
            </div>
            {firstYearTotals.map((total, idx) => {
              const isBest = idx === bestValueIdx;
              const savingsVsWorst = Math.max(...firstYearTotals) - total;
              return (
                <div key={idx} className="text-right">
                  <p
                    className={cn(
                      'text-xl font-bold tabular-nums',
                      isBest ? 'text-emerald-400' : 'text-primary'
                    )}
                  >
                    {formatDollar(total)}
                  </p>
                  {savingsVsWorst > 0 && (
                    <p className="text-xs text-emerald-400 mt-0.5">
                      Save {formatDollar(savingsVsWorst)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Responsive Mobile View - Cards stacked */}
      <div className="md:hidden space-y-4">
        <p className="text-xs text-muted-foreground text-center">
          Scroll right on the table above, or view individual breakdowns below
        </p>
        {properties.map((prop, idx) => {
          const yearTotal = firstYearTotals[idx];
          const isBest = idx === bestValueIdx;
          return (
            <Card
              key={prop.id}
              className={cn(isBest ? 'border-emerald-500/50' : '')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{prop.title}</CardTitle>
                  {isBest && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Trophy className="h-3 w-3 mr-1" />
                      Best
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Move-in</p>
                    <p className="text-sm font-semibold">{formatDollar(prop.estimate.move_in_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="text-sm font-semibold">{formatDollar(prop.estimate.monthly_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Moving</p>
                    <p className="text-sm font-semibold">{formatDollar(prop.estimate.moving_total)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t text-center">
                  <p className="text-xs text-muted-foreground">First-year total</p>
                  <p className={cn('text-lg font-bold', isBest ? 'text-emerald-400' : 'text-primary')}>
                    {formatDollar(yearTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export type { PropertyEstimate };
